import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthSecret, isAuthEnabled } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const secret = getAuthSecret();
  const isApi = pathname.startsWith("/api/");
  const token =
    bearerToken(request) ?? request.cookies.get(SESSION_COOKIE)?.value ?? null;

  if (await verifySessionToken(secret, token)) return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  const loginUrl = new URL("/login", request.url);
  const returnTo = `${pathname}${request.nextUrl.search}`;
  if (returnTo !== "/") loginUrl.searchParams.set("next", returnTo);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest).*)",
  ],
};
