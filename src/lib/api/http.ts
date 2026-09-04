import { isRequestAuthorized } from "@/lib/auth/session";
import { isDatabaseConnectionError } from "@/lib/prisma";

export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Returns a 401 response when the caller has no valid session, else null. */
export async function rejectUnauthorized(
  request: Request
): Promise<Response | null> {
  if (await isRequestAuthorized(request)) return null;
  return apiError("Unauthorized", 401);
}

export function apiFailure(error: unknown): Response {
  if (isDatabaseConnectionError(error)) {
    return apiError("Database is unavailable. Try again shortly.", 503);
  }
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  console.error("[api]", message);
  return apiError(message, 500);
}
