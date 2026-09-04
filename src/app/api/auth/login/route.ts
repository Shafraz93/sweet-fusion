import { getAuthSecret, isAuthEnabled, isPasswordCorrect } from "@/lib/auth/config";
import { SESSION_TTL_SECONDS, createSessionToken } from "@/lib/auth/token";

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return Response.json(
      { error: "Login is not configured. Set APP_PASSWORD on the server." },
      { status: 503 }
    );
  }

  let password: unknown;
  try {
    ({ password } = (await request.json()) as { password?: unknown });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof password !== "string" || !password.trim()) {
    return Response.json({ error: "Password is required" }, { status: 400 });
  }

  if (!(await isPasswordCorrect(password.trim()))) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createSessionToken(getAuthSecret(), "mobile");
  return Response.json({ token, expiresIn: SESSION_TTL_SECONDS });
}
