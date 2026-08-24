import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, Factory, ShoppingCart, Truck } from "lucide-react";
import { getProductTraceability } from "@/lib/actions/products";
import { PageHeader } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/utils";
import { unitLabel, PRODUCT_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function TraceabilityPage({
  params,
}: PageProps<"/products/[id]/traceability">) {
  const { id } = await params;
  const { product, movements } = await getProductTraceability(id);
  if (!product) notFound();

  const timelineEvents: Array<{
    date: Date;
    type: string;
    title: string;
    details: string;
    cost?: string;
    icon: React.ReactNode;
  }> = [];

  for (const lot of product.productLots) {
    if (lot.purchaseItem) {
      timelineEvents.push({
        date: lot.purchaseItem.purchase.purchaseDate,
        type: "PURCHASE",
        title: `Purchased from ${lot.purchaseItem.purchase.supplier.name}`,
        details: `${toNumber(lot.initialQuantity)} ${unitLabel(lot.unit)} @ ${formatCurrency(lot.purchaseItem.unitCost)}/unit · Invoice: ${lot.purchaseItem.purchase.invoiceRef ?? lot.purchaseItem.purchase.purchaseNumber}`,
        cost: formatCurrency(lot.purchaseCost),
        icon: <Truck className="h-4 w-4" />,
      });
    }
    if (lot.productionBatch) {
      const batch = lot.productionBatch;
      const ingList = batch.ingredients
        .map((i) => `${i.rawMaterial.name}: ${toNumber(i.quantityUsed)} ${unitLabel(i.unit)}`)
        .join(", ");
      timelineEvents.push({
        date: batch.productionDate,
        type: "PRODUCTION",
        title: `Production Batch ${batch.batchNumber}`,
        details: `Output: ${toNumber(batch.outputQuantity)} ${unitLabel(batch.outputUnit)} · Ingredients: ${ingList}`,
        cost: formatCurrency(batch.costPerUnit) + "/unit",
        icon: <Factory className="h-4 w-4" />,
      });
    }
    if (lot.packagingOperation) {
      const pkg = lot.packagingOperation;
      const matList = pkg.materials
        .map((m) => `${m.packagingMaterial.name}: ${toNumber(m.quantityUsed)}`)
        .join(", ");
      timelineEvents.push({
        date: pkg.operationDate,
        type: "PACKAGING",
        title: `Packaging ${pkg.operationNumber}`,
        details: `Materials: ${matList}`,
        cost: formatCurrency(pkg.costPerUnit) + "/unit total",
        icon: <Package className="h-4 w-4" />,
      });
    }
    for (const sale of lot.salesOrderItems) {
      timelineEvents.push({
        date: sale.salesOrder.orderDate,
        type: "SALE",
        title: `Sold to ${sale.salesOrder.customer.name}`,
        details: `Order ${sale.salesOrder.orderNumber} · ${toNumber(sale.quantity)} ${unitLabel(sale.unit)} @ ${formatCurrency(sale.unitPrice)}`,
        cost: formatCurrency(sale.totalPrice),
        icon: <ShoppingCart className="h-4 w-4" />,
      });
    }
  }

  timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <div className="mb-4">
        <Link href={`/products/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Product
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`Traceability: ${product.name}`}
        description={`Complete supply chain history for ${PRODUCT_TYPES.find((t) => t.value === product.type)?.label}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Supply Chain Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No traceability events recorded yet.</p>
            ) : (
              <div className="relative space-y-0">
                {timelineEvents.map((event, idx) => (
                  <div key={idx} className="relative flex gap-4 pb-8 last:pb-0">
                    {idx < timelineEvents.length - 1 && (
                      <div className="absolute left-5 top-10 h-full w-0.5 bg-slate-200" />
                    )}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                      {event.icon}
                    </div>
                    <div className="flex-1 rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="info" className="mb-1">
                            {event.type}
                          </Badge>
                          <p className="font-semibold text-slate-900">{event.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{event.details}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(event.date)}
                          </p>
                        </div>
                        {event.cost && (
                          <p className="font-semibold text-slate-900">{event.cost}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Avg Cost</span>
                <span className="font-semibold">{formatCurrency(product.averageCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Selling Price</span>
                <span>{formatCurrency(product.sellingPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wholesale Price</span>
                <span>{formatCurrency(product.wholesalePrice)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {movements.slice(0, 10).map((m) => (
                  <div key={m.id} className="text-sm border-b border-slate-100 pb-2">
                    <div className="flex justify-between">
                      <Badge variant="default">{m.movementType}</Badge>
                      <span className={toNumber(m.quantity) < 0 ? "text-red-600" : "text-emerald-600"}>
                        {toNumber(m.quantity) > 0 ? "+" : ""}
                        {toNumber(m.quantity)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(m.movementDate)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
