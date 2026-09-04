"use server";

import { redirect } from "next/navigation";
import { isAuthEnabled, isPasswordCorrect } from "@/lib/auth/config";
import { endWebSession, startWebSession } from "@/lib/auth/session";

/** Only allow same-site paths so `?next=` can't be used as an open redirect. */
function safeReturnPath(value: string | undefined | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function loginWithPassword(
  password: string,
  next?: string
): Promise<{ error: string } | void> {
  if (!isAuthEnabled()) {
    redirect(safeReturnPath(next));
  }

  if (!(await isPasswordCorrect(password.trim()))) {
    return { error: "Incorrect password" };
  }

  await startWebSession("owner");
  redirect(safeReturnPath(next));
}

export async function logout(): Promise<void> {
  await endWebSession();
  redirect("/login");
}
