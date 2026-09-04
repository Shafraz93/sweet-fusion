import { Sidebar } from "@/components/layout/sidebar";
import { isAuthEnabled } from "@/lib/auth/config";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar showLogout={isAuthEnabled()} />
      <main className="flex-1 overflow-auto lg:ml-0 pt-14 lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
