import { type Request, type Response, type NextFunction } from "express";
import { ApiError } from "./error-handler.js";

/**
 * Tenant guard middleware.
 *
 * Verifies that `req.params.companyId` (if present) matches `req.tenantId`.
 * This prevents a valid credential for tenant A from accessing tenant B's resources.
 *
 * No-op when:
 * - The route has no `:companyId` param
 * - `req.tenantId` is not set (auth is not enforced)
 */
export default function tenantGuard(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const companyId = req.params.companyId;
  const tenantId = req.tenantId;

  // Skip if no companyId param or tenantId not set (auth not enforced)
  if (!companyId || !tenantId) {
    next();
    return;
  }

  if (companyId !== tenantId) {
    throw new ApiError(403, "Forbidden: tenant mismatch");
  }

  next();
}
