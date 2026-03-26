import { type Request, type Response, type NextFunction } from "express";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Not found: ${req.method} ${req.path}`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Accept a caller-supplied correlation ID only if it is a valid UUID.
  // Fall back to a fresh UUID to prevent header injection into logs/responses.
  const rawId = req.headers["x-request-id"];
  const requestId =
    typeof rawId === "string" && UUID_RE.test(rawId)
      ? rawId
      : crypto.randomUUID();

  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, requestId });
    return;
  }
  console.error({ requestId, error: err });
  res.status(500).json({ error: "Internal server error", requestId });
}
