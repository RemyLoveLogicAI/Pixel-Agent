# API Design Standards

This document defines the canonical API design standards for the Pixel-Agent platform. All new endpoints MUST conform to these conventions. Existing endpoints should be migrated incrementally.

---

## 1. Response Envelope Standard

Every API response uses a consistent JSON envelope. Clients can rely on the shape of this envelope regardless of endpoint.

### Success Response

```jsonc
{
  "ok": true,
  "data": { /* resource or array of resources */ },
  "meta": {                // optional — present on list endpoints
    "pagination": { ... }  // see Section 2
  }
}
```

- `ok` is always `true` for 2xx responses.
- `data` contains the primary payload. For single-resource endpoints it is an object; for list endpoints it is an array.
- `meta` is reserved for response-level metadata (pagination, rate-limit hints, deprecation notices). Omit when empty.

### Accepted (202) Response

Used by heartbeat creation, swarm creation, and other async operations.

```jsonc
{
  "ok": true,
  "data": {
    "id": "swarm_abc123",
    "status": "pending_approval"
  },
  "meta": {
    "async": true,
    "pollUrl": "/api/companies/:companyId/swarms/swarm_abc123"
  }
}
```

### Error Response

```jsonc
{
  "ok": false,
  "error": {
    "code": "BUDGET_EXCEEDED",
    "message": "Monthly budget of $500.00 has been exhausted.",
    "details": {}          // optional — validation errors, context
  }
}
```

- `ok` is always `false` for 4xx/5xx responses.
- `error.code` is a machine-readable string from the error taxonomy below.
- `error.message` is a human-readable explanation safe to display in a UI.
- `error.details` carries structured context (e.g., Zod validation issues, conflicting version numbers).

### Error Code Taxonomy

Error codes are uppercase snake_case strings grouped by domain.

| Code | HTTP Status | Description |
|------|-------------|-------------|
| **General** | | |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Request body/params failed Zod validation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method not supported on this route |
| `RATE_LIMITED` | 429 | Request rejected due to rate limiting |
| `CONFLICT` | 409 | Optimistic locking conflict or duplicate resource |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| **Tasks** | | |
| `TASK_ALREADY_CLAIMED` | 409 | Task version mismatch during claim |
| `TASK_INVALID_TRANSITION` | 422 | Invalid task status transition |
| **Budget** | | |
| `BUDGET_EXCEEDED` | 402 | Operation would exceed the company budget |
| `BUDGET_ALERT_THRESHOLD` | 422 | Budget alert threshold is invalid |
| **Governance** | | |
| `GOVERNANCE_EXPIRED` | 410 | Governance request TTL has elapsed |
| `GOVERNANCE_ALREADY_RESOLVED` | 409 | Request was already approved/denied |
| `GOVERNANCE_INSUFFICIENT_DELEGATION` | 403 | Agent lacks delegation level for this action |
| **Swarm** | | |
| `SWARM_INVALID_PHASE` | 422 | Invalid swarm lifecycle phase transition |
| `SWARM_AGENT_LIMIT` | 422 | Swarm has reached its agent cap |
| `SWARM_CIRCUIT_OPEN` | 503 | Circuit breaker is open for this swarm/agent |
| **Agent** | | |
| `AGENT_CIRCUIT_OPEN` | 503 | Agent circuit breaker is in open state |
| `AGENT_NOT_IDLE` | 409 | Agent is already executing and cannot accept work |

---

## 2. Pagination Standard

All list endpoints use **cursor-based pagination** by default. Cursor-based pagination provides stable results when data is inserted or deleted between pages.

### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 25 | Items per page. Max 100. |
| `cursor` | string | (none) | Opaque cursor from a previous response. Omit for the first page. |
| `sort` | string | `createdAt` | Field to sort by. Only allowlisted fields per endpoint. |
| `order` | `asc` \| `desc` | `desc` | Sort direction. |

### Response Shape

```jsonc
{
  "ok": true,
  "data": [ ... ],
  "meta": {
    "pagination": {
      "limit": 25,
      "hasMore": true,
      "nextCursor": "eyJpZCI6ImFiYzEyMyJ9",
      "prevCursor": "eyJpZCI6Ind4eTc4OSJ9"  // null on first page
    }
  }
}
```

### Cursor Encoding

Cursors are base64url-encoded JSON objects containing the sort field value and the row ID. Clients MUST treat cursors as opaque strings. The server validates and decodes them internally.

```ts
// Internal cursor structure (never exposed to clients)
{ id: string; sortValue: string | number }
```

### Offset Fallback

Some administrative or dashboard endpoints may support `offset`/`limit` pagination where cursor-based is impractical (e.g., `GET /traces` with complex filtering). These endpoints include `meta.pagination.total` instead of cursors.

---

## 3. Rate Limiting Strategy

Rate limiting protects expensive or side-effectful endpoints. Limits are applied per company (identified by `companyId` path parameter) using a sliding window algorithm.

### Tier Definitions

| Tier | Window | Max Requests | Applies To |
|------|--------|--------------|------------|
| **Critical** | 1 minute | 5 | Swarm creation, heartbeat trigger |
| **Write** | 1 minute | 30 | POST/PUT/PATCH/DELETE on all resource endpoints |
| **Governance** | 1 minute | 20 | Governance request submission and approval |
| **Read** | 1 minute | 120 | GET on all resource endpoints |
| **Stream** | per connection | 1 concurrent | SSE event stream |

### Endpoint-to-Tier Mapping

| Endpoint | Tier |
|----------|------|
| `POST /companies/:companyId/heartbeat` | Critical |
| `POST /companies/:companyId/swarms` | Critical |
| `POST /companies/:companyId/governance` | Governance |
| `POST /companies/:companyId/governance/:id/approve` | Governance |
| `POST /companies/:companyId/governance/:id/deny` | Governance |
| `GET /companies/:companyId/events` (SSE) | Stream |
| All other `GET` | Read |
| All other write operations | Write |

### Rate Limit Response Headers

Every response includes rate limit headers:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1710500000
```

When exceeded, the server returns:

```jsonc
// HTTP 429
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Try again in 42 seconds.",
    "details": {
      "retryAfter": 42,
      "limit": 5,
      "window": "1m"
    }
  }
}
```

The `Retry-After` HTTP header is also set (in seconds).

---

## 4. Error Handling Conventions

### ApiError Class Extension

The existing `ApiError` class should be extended to carry a structured error code:

```ts
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "INTERNAL_ERROR",
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

### Error Code to HTTP Status Mapping

The `code` field is the machine-readable identifier. The `status` field determines the HTTP status code. The mapping in Section 1's taxonomy is normative. When throwing an `ApiError`, always supply both:

```ts
throw new ApiError(409, "Task already claimed by another agent", "TASK_ALREADY_CLAIMED", {
  currentVersion: task.version,
  suppliedVersion: body.version,
});
```

### Error Handler Middleware

The `errorHandler` middleware maps errors into the envelope format:

```ts
function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: { issues: err.issues },
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}
```

### Async Phase Error Propagation (Swarms and Heartbeats)

Errors during async processing (swarm phases, heartbeat agent runs) do NOT return HTTP errors to the original caller (which received a 202). Instead:

1. **Record the error** on the run record: set `status` to `failed`, populate an `errorCode` and `errorMessage` column.
2. **Broadcast via SSE**: publish an event to `GET /companies/:companyId/events` with type `swarm.phase.failed` or `heartbeat.agent.failed` containing the error code and message.
3. **Circuit breaker integration**: if an agent fails repeatedly, the `CircuitBreaker` opens. Subsequent attempts return `AGENT_CIRCUIT_OPEN` or `SWARM_CIRCUIT_OPEN` synchronously on the next request that would invoke that agent.

### Error Logging

- 4xx errors: log at `warn` level. Do not include stack traces.
- 5xx errors: log at `error` level. Include full stack trace and request context (method, path, companyId).
- Never log request bodies (may contain sensitive data). Log a request ID instead.

---

## 5. Versioning Strategy

### URL Path Versioning

The API is versioned via a path prefix. The current version is `v1`.

```
/api/v1/companies/:companyId/agents
/api/v1/companies/:companyId/swarms
```

The existing `/api/...` routes are treated as `v1` during migration. Once the versioned prefix is adopted, the un-versioned paths will redirect to `/api/v1/...` with a `Deprecation` header for one major release cycle.

### Version Lifecycle

| Phase | Duration | Behavior |
|-------|----------|----------|
| **Current** | Indefinite | Actively developed and supported |
| **Deprecated** | 6 months minimum | Functional but emits `Deprecation` and `Sunset` headers |
| **Sunset** | After deprecation period | Returns 410 Gone with migration guidance |

### Deprecation Headers

When a version or endpoint enters deprecation:

```
Deprecation: true
Sunset: Sat, 15 Sep 2026 00:00:00 GMT
Link: </api/v2/docs>; rel="successor-version"
```

### Breaking vs Non-Breaking Changes

**Non-breaking** (no version bump required):
- Adding new optional fields to response `data`
- Adding new endpoints
- Adding new optional query parameters
- Adding new error codes

**Breaking** (requires new version):
- Removing or renaming fields in response `data`
- Changing the type of an existing field
- Removing an endpoint
- Changing the meaning of an existing error code
- Changing the pagination model for an endpoint

### Router Organization

Each version gets its own router tree:

```
artifacts/api-server/src/
  routes/
    v1/
      index.ts        # mounts all v1 routers
      agents.ts
      swarms.ts
      ...
    v2/               # created only when needed
      index.ts
```

Mount in `app.ts`:

```ts
app.use("/api/v1", v1Router);
// app.use("/api/v2", v2Router);  // when v2 exists
app.use("/api", v1Router);        // un-versioned alias during migration
```
