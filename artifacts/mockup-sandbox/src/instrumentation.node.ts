import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { ExportResultCode } from "@opentelemetry/core";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { trace, context, SpanStatusCode } from "@opentelemetry/api";
import * as Module from "module";
import * as path from "path";
import * as fs from "fs";
import { inspect } from "util";
import express, { Request, Response } from "express";

// Force ws to use the pure JS path. Some bundlers partially shim optional
// native bufferutil, which breaks sends with `bufferUtil.mask is not a function`.
process.env.WS_NO_BUFFER_UTIL ??= "1";
const WsModule = require("ws") as typeof import("ws");
const WebSocket = (WsModule.WebSocket ??
  WsModule) as typeof import("ws").WebSocket;

// Hardcoded API_KEY
const API_KEY = "sysk_w8P8Jf4wW2tbHfrV0TSOImc0YtHGzFO";

// Identifier Configuration
const APP_ID = "ts-6";
const APP_NAME = "mockup-sandbox";
const PROJECT_ID = "your-project-id";

// ===== Configuration Switches =====
// Set to false to disable all debug log output in instrumentation.ts file
const ENABLE_DEBUG_LOG = true;
// Set to true to enable CachedSpanExporter console output (disabled by default)
const ENABLE_CONSOLE_EXPORTER = false;
// ===================================

class CachedSpanExporter extends ConsoleSpanExporter {
  private enabled: boolean;

  constructor() {
    super();
    this.enabled = ENABLE_CONSOLE_EXPORTER;
  }

  private isInstrumentationSpan(span: ReadableSpan): boolean {
    const attrs = span.attributes;
    const httpUrl = attrs["http.url"] as string | undefined;
    const httpHost = attrs["http.host"] as string | undefined;
    const netPeerName = attrs["net.peer.name"] as string | undefined;
    const httpTarget = attrs["http.target"] as string | undefined;

    if (
      httpUrl?.includes("api.syn-cause.com") ||
      httpHost?.includes("api.syn-cause.com") ||
      netPeerName?.includes("api.syn-cause.com")
    ) {
      return true;
    }

    if (
      httpUrl?.includes("localhost:43210") ||
      httpUrl?.includes("127.0.0.1:43210") ||
      httpHost?.includes("localhost:43210") ||
      httpHost?.includes("127.0.0.1:43210") ||
      httpTarget?.includes("/remote-debug/")
    ) {
      return true;
    }

    return false;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: { code: number }) => void,
  ): void {
    try {
      const filteredSpans = spans.filter((s) => !this.isInstrumentationSpan(s));

      for (const s of filteredSpans) spanCache.addSpan(s);
      if (this.enabled) {
        super.export(filteredSpans, resultCallback);
      } else {
        if (resultCallback) resultCallback({ code: ExportResultCode.SUCCESS });
        return;
      }
      if (resultCallback) resultCallback({ code: ExportResultCode.SUCCESS });
    } catch {
      if (resultCallback) resultCallback({ code: ExportResultCode.FAILED });
    }
  }
}

interface CachedSpanRec {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: { code: number; message?: string };
  attributes: Record<string, any>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes: Record<string, any>;
  }>;
  links: Array<{
    traceId: string;
    spanId: string;
    attributes: Record<string, any>;
  }>;
}

class SpanCache {
  private spans = new Map<string, CachedSpanRec>();
  private maxSpans = 10000;
  private cleanupThreshold = 0.85;
  addSpan(span: ReadableSpan): void {
    const start = span.startTime[0] * 1_000_000 + span.startTime[1] / 1000;
    const end = span.endTime[0] * 1_000_000 + span.endTime[1] / 1000;
    const rec: CachedSpanRec = {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      parentSpanId: (span as any).parentSpanId,
      name: span.name,
      kind: String(span.kind),
      startTime: start,
      endTime: end,
      duration: end - start,
      status: { code: span.status.code, message: span.status.message },
      attributes: { ...span.attributes },
      events: (span.events || []).map((e) => ({
        name: e.name,
        timestamp: e.time[0] * 1_000_000 + e.time[1] / 1000,
        attributes: { ...e.attributes },
      })),
      links: (span.links || []).map((l) => ({
        traceId: l.context.traceId,
        spanId: l.context.spanId,
        attributes: { ...l.attributes },
      })),
    };
    this.spans.set(rec.spanId, rec);
    if (this.spans.size > this.maxSpans * this.cleanupThreshold) this.cleanup();
  }
  getAllSpans(limit?: number): CachedSpanRec[] {
    const arr = Array.from(this.spans.values()).sort(
      (a, b) => a.startTime - b.startTime,
    );
    return typeof limit === "number" ? arr.slice(-limit) : arr;
  }
  getSpansByTraceId(traceId: string): CachedSpanRec[] {
    return this.getAllSpans().filter((s) => s.traceId === traceId);
  }
  getSpansByFunctionName(name: string): CachedSpanRec[] {
    return this.getAllSpans().filter(
      (s) => s.attributes["function.name"] === name,
    );
  }
  getSpansByTimeRange(startTime: number, endTime: number): CachedSpanRec[] {
    return this.getAllSpans().filter(
      (s) => s.startTime >= startTime && s.endTime <= endTime,
    );
  }
  getTraceIds(startTime?: number, endTime?: number, limit?: number): string[] {
    const spans = this.getAllSpans();
    let filteredSpans = spans;

    if (typeof startTime === "number" && typeof endTime === "number") {
      filteredSpans = spans.filter(
        (s) => s.startTime >= startTime && s.endTime <= endTime,
      );
    }

    const traceIds = Array.from(
      new Set(filteredSpans.map((s) => s.traceId)),
    ).sort((a, b) => {
      const aTime = Math.min(
        ...spans.filter((s) => s.traceId === a).map((s) => s.startTime),
      );
      const bTime = Math.min(
        ...spans.filter((s) => s.traceId === b).map((s) => s.startTime),
      );
      return bTime - aTime;
    });

    return typeof limit === "number" ? traceIds.slice(0, limit) : traceIds;
  }
  clear(): void {
    this.spans.clear();
  }
  getStatistics() {
    const spans = Array.from(this.spans.values());
    const traceIds = new Set(spans.map((s) => s.traceId));
    const fnNames = new Set(
      spans.map((s) => s.attributes["function.name"]).filter(Boolean),
    );
    const durations = spans.map((s) => s.duration);
    return {
      totalSpans: spans.length,
      totalTraces: traceIds.size,
      totalFunctions: fnNames.size,
      oldestSpan: spans.length ? Math.min(...spans.map((s) => s.startTime)) : 0,
      newestSpan: spans.length ? Math.max(...spans.map((s) => s.startTime)) : 0,
      averageDuration: spans.length
        ? durations.reduce((a, b) => a + b, 0) / spans.length
        : 0,
    };
  }
  private cleanup(): void {
    const arr = this.getAllSpans();
    const drop = Math.floor(arr.length * 0.2);
    for (let i = 0; i < drop; i++) this.spans.delete(arr[i].spanId);
  }
}

const spanCache = new SpanCache();

export function init() {
  const sdk = new NodeSDK({
    traceExporter: new CachedSpanExporter(),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  if (ENABLE_DEBUG_LOG) console.log("[DEBUG] OpenTelemetry SDK started");
}
