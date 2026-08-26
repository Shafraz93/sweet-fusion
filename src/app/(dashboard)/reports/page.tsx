import { Suspense } from "react";
import {
  getSalesReport,
  getPurchaseReport,
  getProductionReport,
  getProfitReport,
} from "@/lib/actions/reports";
import { PageHeader } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateFilter } from "@/components/layout/filters";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

async function ReportCards({ period }: { period: string }) {
  const [sales, purchases, production, profit] = await Promise.all([
    getSalesReport(period),
    getPurchaseReport(period),
    getProductionReport(period),
    getProfitReport(period),
  ]);

  const reports = [
    {
      title: "Sales Report",
      description: `${sales.orders.length} orders`,
      value: formatCurrency(sales.total),
      exportType: "sales" as const,
    },
    {
      title: "Purchase Report",
      description: `${purchases.length} purchases recorded`,
      value: formatCurrency(
        purchases.reduce((s, p) => s + Number(p.totalAmount), 0)
      ),
      exportType: "purchases" as const,
    },
    {
      title: "Production Report",
      description: `${production.length} batches produced`,
      value: formatCurrency(
        production.reduce((s, p) => s + Number(p.totalCost), 0)
      ),
    },
    {
      title: "Profit Summary",
      description: `Net profit for period`,
      value: formatCurrency(profit.netProfit),
      exportType: "profit" as const,
    },
    {
      title: "Inventory Snapshot",
      description: "Current stock levels and values",
      value: "All stock",
      exportType: "inventory" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reports.map((report) => (
        <Card key={report.title}>
          <CardHeader>
            <CardTitle className="text-base">{report.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-slate-900">{report.value}</p>
            <p className="text-sm text-slate-500">{report.description}</p>
            {"exportType" in report && report.exportType && (
              <a
                href={`/api/reports/export?type=${report.exportType}&period=${period}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:underline"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  const params = await searchParams;
  const period = (params.period as string) ?? "month";

  return (
    <>
      <PageHeader
        title="Reports"
        description="Business reports and CSV exports"
        action={
          <Suspense fallback={<div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200" />}>
            <DateFilter />
          </Suspense>
        }
      />
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        }
      >
        <ReportCards period={period} />
      </Suspense>
    </>
  );
}
