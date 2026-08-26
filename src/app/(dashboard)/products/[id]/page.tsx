import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProductHistory } from "@/lib/actions/products";
import { calculateProfitMetrics } from "@/lib/costing";
import {
  PageHeader,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, toNumber, lineRevenueAfterDiscount } from "@/lib/utils";
import { unitLabel, PRODUCT_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params;
  const [product, history] = await Promise.all([
    getProduct(id),
    getProductHistory(id),
  ]);
  if (!product) notFound();

  const costPerUnit = toNumber(product.averageCost);
  const profit = calculateProfitMetrics(
    toNumber(product.sellingPrice),
    toNumber(product.wholesalePrice),
    costPerUnit
  );

  const wastedQty = toNumber(product.currentStock);
  const wastedValue = wastedQty * costPerUnit;
  const soldProfit = history.soldProfit;
  const profitMargin =
    history.soldRevenue > 0 ? (soldProfit / history.soldRevenue) * 100 : 0;

  const buyingEntries = [
    ...history.purchases.map((item) => ({
      key: `purchase-${item.id}`,
      date: item.purchase.purchaseDate,
      reference: item.purchase.purchaseNumber,
      href: `/purchases/${item.purchaseId}/edit`,
      source: item.purchase.supplier.name,
      quantity: toNumber(item.quantity),
      unit: item.unit,
      total: toNumber(item.totalCost),
    })),
    ...history.production.map((batch) => ({
      key: `production-${batch.id}`,
      date: batch.productionDate,
      reference: batch.batchNumber,
      href: `/production/${batch.id}/edit`,
      source: "Production",
      quantity: toNumber(batch.outputQuantity),
      unit: batch.outputUnit,
      total: toNumber(batch.totalCost),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const hasBuying = buyingEntries.length > 0;

  const purchaseCostTotal = history.purchases.reduce(
    (sum, item) => sum + toNumber(item.totalCost),
    0
  );
  const productionCostTotal = history.production.reduce(
    (sum, batch) => sum + toNumber(batch.totalCost),
    0
  );
  const productionIngredientCost = history.production.reduce(
    (sum, batch) => sum + toNumber(batch.ingredientCost),
    0
  );
  const productionLabourCost = history.production.reduce(
    (sum, batch) => sum + toNumber(batch.labourCost),
    0
  );
  const productionOtherCost = history.production.reduce(
    (sum, batch) => sum + toNumber(batch.otherCost),
    0
  );
  const soldPackagingCost = history.sales.reduce(
    (sum, item) => sum + toNumber(item.packagingCost),
    0
  );
  const soldProductCost = history.soldCost - soldPackagingCost;

  return (
    <>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} · ${product.category.name}`}
        action={
          <Link href={`/products/${id}/edit`}>
            <Button variant="outline">Edit Product</Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Wasted (Stock)</p>
            <p className="text-xl font-bold text-amber-700">
              {wastedQty} {unitLabel(product.unit)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatCurrency(wastedValue)} at {formatCurrency(product.averageCost)}/unit
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Bought</p>
            <p className="text-xl font-bold">
              {history.buyingTotalQty.toLocaleString()} {unitLabel(product.unit)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatCurrency(history.buyingTotalCost)} total cost
            </p>
            {history.buyingTotalCost > 0 ? (
              <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                {purchaseCostTotal > 0 ? (
                  <li className="flex justify-between gap-2">
                    <span>Purchases</span>
                    <span className="font-medium">{formatCurrency(purchaseCostTotal)}</span>
                  </li>
                ) : null}
                {productionCostTotal > 0 ? (
                  <li className="flex justify-between gap-2">
                    <span>Production</span>
                    <span className="font-medium">{formatCurrency(productionCostTotal)}</span>
                  </li>
                ) : null}
                {productionCostTotal > 0 ? (
                  <>
                    <li className="flex justify-between gap-2 pl-2 text-slate-500">
                      <span>Ingredients</span>
                      <span>{formatCurrency(productionIngredientCost)}</span>
                    </li>
                    <li className="flex justify-between gap-2 pl-2 text-slate-500">
                      <span>Labour</span>
                      <span>{formatCurrency(productionLabourCost)}</span>
                    </li>
                    <li className="flex justify-between gap-2 pl-2 text-slate-500">
                      <span>Other</span>
                      <span>{formatCurrency(productionOtherCost)}</span>
                    </li>
                  </>
                ) : null}
              </ul>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Sold</p>
            <p className="text-xl font-bold">
              {history.soldQty.toLocaleString()} {unitLabel(product.unit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Profit</p>
            <p className="text-xl font-bold text-emerald-700">
              {formatCurrency(soldProfit)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {history.soldRevenue > 0
                ? `${profitMargin.toFixed(1)}% margin · cost ${formatCurrency(history.soldCost)}`
                : "No sales yet"}
            </p>
            {history.soldCost > 0 ? (
              <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                <li className="flex justify-between gap-2">
                  <span>Product cost</span>
                  <span className="font-medium">{formatCurrency(soldProductCost)}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Packaging cost</span>
                  <span className="font-medium">{formatCurrency(soldPackagingCost)}</span>
                </li>
              </ul>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Revenue</p>
            <p className="text-xl font-bold">
              {formatCurrency(history.soldRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              After discounts · {history.soldQty.toLocaleString()}{" "}
              {unitLabel(product.unit)} sold
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Type</p>
              <Badge variant="info" className="mt-1">
                {PRODUCT_TYPES.find((t) => t.value === product.type)?.label}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-slate-500">Min Stock Level</p>
              <p className="font-semibold">
                {toNumber(product.minStockLevel)} {unitLabel(product.unit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Sell Price</p>
              <p className="font-semibold">{formatCurrency(product.sellingPrice)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Average Cost</p>
              <p className="font-semibold">{formatCurrency(product.averageCost)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Wholesale Price</p>
              <p className="font-semibold">{formatCurrency(product.wholesalePrice)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Per Unit Profit</p>
              <p className="font-semibold text-emerald-700">
                {formatCurrency(profit.retailProfit)}
              </p>
            </div>
            {product.description && (
              <div className="sm:col-span-2">
                <p className="text-sm text-slate-500">Description</p>
                <p>{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="font-medium text-slate-700">Total Profit (sold)</span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(soldProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Profit Margin</span>
              <span>{profitMargin.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Per Unit (at sell price)</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(profit.retailProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Retail Margin</span>
              <span>{profit.retailMargin.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Wholesale Profit / unit</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(profit.wholesaleProfit)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {product.recipes.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recipes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {product.recipes.map((recipe) => (
                <li key={recipe.id}>
                  <Link href={`/recipes/${recipe.id}`} className="text-rose-600 hover:underline">
                    {recipe.name} — yields {toNumber(recipe.expectedOutputQty)}{" "}
                    {unitLabel(recipe.outputUnit)}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Buying History</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasBuying ? (
              <p className="text-sm text-slate-500">No purchases or production yet.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Reference</TH>
                    <TH>Source</TH>
                    <TH>Qty</TH>
                    <TH>Unit Cost</TH>
                    <TH>Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {buyingEntries.map((entry) => (
                    <TR key={entry.key}>
                      <TD>{formatDate(entry.date)}</TD>
                      <TD>
                        <Link
                          href={entry.href}
                          className="text-rose-600 hover:underline"
                        >
                          {entry.reference}
                        </Link>
                      </TD>
                      <TD>{entry.source}</TD>
                      <TD>
                        {entry.quantity} {unitLabel(entry.unit)}
                      </TD>
                      <TD>
                        {entry.quantity > 0
                          ? formatCurrency(entry.total / entry.quantity)
                          : "—"}
                      </TD>
                      <TD>{formatCurrency(entry.total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selling History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.sales.length === 0 ? (
              <p className="text-sm text-slate-500">No sales yet.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Order</TH>
                    <TH>Customer</TH>
                    <TH>Qty</TH>
                    <TH>Revenue</TH>
                    <TH>Cost</TH>
                    <TH>Profit</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {history.sales.map((item) => {
                    const lineRevenue = lineRevenueAfterDiscount(
                      item.totalPrice,
                      item.salesOrder.subtotal,
                      item.salesOrder.discount
                    );
                    const lineCost = toNumber(item.totalCost);
                    const lineProductCost = lineCost - toNumber(item.packagingCost);
                    const lineProfit = lineRevenue - lineCost;
                    return (
                    <TR key={item.id}>
                      <TD>{formatDate(item.salesOrder.orderDate)}</TD>
                      <TD>
                        <Link
                          href={`/orders/${item.salesOrderId}/edit`}
                          className="text-rose-600 hover:underline"
                        >
                          {item.salesOrder.orderNumber}
                        </Link>
                      </TD>
                      <TD>{item.salesOrder.customer.name}</TD>
                      <TD>
                        {toNumber(item.quantity)} {unitLabel(item.unit)}
                      </TD>
                      <TD>{formatCurrency(lineRevenue)}</TD>
                      <TD>
                        <span className="block">{formatCurrency(lineCost)}</span>
                        {toNumber(item.packagingCost) > 0 ? (
                          <span className="text-xs text-slate-500">
                            product {formatCurrency(lineProductCost)} + pkg{" "}
                            {formatCurrency(item.packagingCost)}
                          </span>
                        ) : null}
                      </TD>
                      <TD className="font-medium text-emerald-700">
                        {formatCurrency(lineProfit)}
                      </TD>
                      <TD>
                        <PaymentBadge status={item.salesOrder.paymentStatus} />
                      </TD>
                    </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
