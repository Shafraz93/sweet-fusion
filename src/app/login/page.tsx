import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { isAuthEnabled } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  if (!isAuthEnabled() || (await getSession())) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <LoginForm next={next} />
      </div>
    </main>
  );
}
