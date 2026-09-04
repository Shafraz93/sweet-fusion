import { safeEqual } from "@/lib/auth/token";

/**
 * Single shared password guards both the web app and the mobile API.
 * Auth stays disabled until APP_PASSWORD is set, so local dev and existing
 * deployments keep working until the password is configured.
 */
export function getAppPassword(): string {
  return process.env.APP_PASSWORD?.trim() ?? "";
}

export function isAuthEnabled(): boolean {
  return getAppPassword().length > 0;
}

export function getAuthSecret(): string {
  const explicit = process.env.AUTH_SECRET?.trim();
  if (explicit) return explicit;
  return `sweet-fusion-derived-key:${getAppPassword()}`;
}

export async function isPasswordCorrect(candidate: string): Promise<boolean> {
  const expected = getAppPassword();
  if (!expected) return false;
  return safeEqual(candidate, expected);
}
