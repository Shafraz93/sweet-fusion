import { Suspense } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Factory,
  Package,
  TrendingUp,
  AlertTriangle,
  Users,
  Truck,
} from "lucide-react";
import { getDashboardData } from "@/lib/actions/dashboard";
import { isDatabaseConnectionError } from "@/lib/prisma";
import { DatabaseError } from "@/components/ui/database-error";
import { StatCard } from "@/components/ui/card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/table";
import {
  SalesChart,
  ProductPieChart,
  StatsGrid,
} from "@/components/charts/dashboard-charts";
import { DateFilter } from "@/components/layout/filters";
import { unitLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function DashboardContent({
  period,
}: {
  period: string;
}) {
  let data;
  try {
    data = await getDashboardData(period);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      const message =
        error instanceof Error &&
        error.message.includes("DATABASE_URL environment variable is not set")
          ? "DATABASE_URL is not set on the server. Add it in Vercel → Settings → Environment Variables, then redeploy."
          : error instanceof Error &&
              error.message.toLowerCase().includes("does not exist")
            ? "Database tables are missing. Run npx prisma db push against your Supabase database, then redeploy."
            : "Connection terminated unexpectedly. The database server is not reachable.";
      return <DatabaseError message={message} />;
    }
    throw error;
  }

  const pieData = data.topProducts.map((p) => ({
    name: p.name,
    value: p.revenue,
  }));

  return (
    <div className="space-y-6">
      <StatsGrid>
        <StatCard
          title="Total Sales"
          value={data.formatted.totalSales}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Total Purchases"
          value={data.formatted.totalPurchases}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          title="Production Cost"
          value={data.formatted.totalProductionCost}
          icon={<Factory className="h-5 w-5" />}
        />
        <StatCard
          title="Packaging Cost"
          value={data.formatted.totalPackagingCost}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Total Profit"
          value={data.formatted.totalProfit}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Inventory Value"
          value={data.formatted.inventoryValue}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Customer Outstanding"
          value={data.formatted.customerOutstanding}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Supplier Outstanding"
          value={data.formatted.supplierOutstanding}
          icon={<Truck className="h-5 w-5" />}
        />
      </StatsGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={data.topProducts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Product Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductPieChart data={pieData} />
          </CardContent>
        </Card>
      </div>

      {data.lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Low Stock Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.lowStock.map((alert) => (
                <div
                  key={`${alert.type}-${alert.id}`}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{alert.name}</p>
                    <p className="text-xs text-slate-500">
                      {alert.type.replace("_", " ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="warning">
                      {alert.current} / {alert.minimum} {unitLabel(alert.unit)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: PageProps<"/">) {
  const params = await searchParams;
  const period = (params.period as string) ?? "month";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your Sweet Fusion business"
        action={
          <Suspense fallback={<div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200" />}>
            <DateFilter />
          </Suspense>
        }
      />
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        }
      >
        <DashboardContent period={period} />
      </Suspense>
    </>
  );
}
