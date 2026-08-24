import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function Layout({ children }: LayoutProps<"/">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
