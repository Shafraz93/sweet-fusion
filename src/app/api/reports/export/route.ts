import { exportReportCSV } from "@/lib/actions/reports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as
    | "sales"
    | "purchases"
    | "inventory"
    | "profit"
    | null;
  const period = searchParams.get("period") ?? "month";

  if (!type || !["sales", "purchases", "inventory", "profit"].includes(type)) {
    return new Response("Invalid report type", { status: 400 });
  }

  const csv = await exportReportCSV(type, period);
  const filename = `sweet-fusion-${type}-${period}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
