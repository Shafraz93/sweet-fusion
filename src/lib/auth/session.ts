import { cookies } from "next/headers";
import { getAuthSecret, isAuthEnabled } from "@/lib/auth/config";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth/token";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(
    getAuthSecret(),
    store.get(SESSION_COOKIE)?.value
  );
}

export async function startWebSession(subject: string): Promise<void> {
  const token = await createSessionToken(getAuthSecret(), subject);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endWebSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Authorization check for route handlers. Proxy already gates these paths, but
 * Server Functions and route handlers are re-verified here so a matcher change
 * can never silently expose data.
 */
export async function isRequestAuthorized(request: Request): Promise<boolean> {
  if (!isAuthEnabled()) return true;

  const secret = getAuthSecret();
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (await verifySessionToken(secret, token)) return true;
  }

  return Boolean(await getSession());
}
