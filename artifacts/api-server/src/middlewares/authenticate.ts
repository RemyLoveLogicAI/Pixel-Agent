import { type Request, type Response, type NextFunction } from "express";
import { ApiError } from "./error-handler.js";

// Extend Express Request to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

// Extend process.env typing
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY?: string;
      REQUIRE_AUTH?: string;
    }
  }
}

/**
 * Authentication middleware.
 *
 * - Parses `Authorization: Bearer <token>` and validates against the `API_KEY` env var.
 * - Extracts `X-Tenant-Id` header and attaches it as `req.tenantId`.
 * - Auth enforcement is controlled by `REQUIRE_AUTH` env var (default: "false").
 *   When disabled, the middleware still extracts tenant info but does not reject requests.
 */
export default function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const requireAuth = process.env.REQUIRE_AUTH === "true";

  const authHeader = req.headers.authorization;
  const tenantId = req.headers["x-tenant-id"] as string | undefined;

  // Always attach tenantId if present
  if (tenantId) {
    req.tenantId = tenantId;
  }

  if (!requireAuth) {
    // In non-enforcing mode, still attach tenantId but skip token validation
    next();
    return;
  }

  // --- Auth is required below this point ---

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new ApiError(
      500,
      "Server misconfiguration: API_KEY is not set but REQUIRE_AUTH is enabled",
    );
  }

  if (!authHeader) {
    throw new ApiError(401, "Unauthorized");
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new ApiError(401, "Unauthorized");
  }

  const token = parts[1];
  if (token !== apiKey) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!tenantId) {
    throw new ApiError(401, "Unauthorized: X-Tenant-Id header is required");
  }

  next();
}
