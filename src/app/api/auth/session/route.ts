import { isAuthEnabled } from "@/lib/auth/config";
import { isRequestAuthorized } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Lets the mobile app check a stored token on launch before showing the app. */
export async function GET(request: Request) {
  const authorized = await isRequestAuthorized(request);
  return Response.json(
    { authorized, authRequired: isAuthEnabled() },
    { status: authorized ? 200 : 401 }
  );
}
