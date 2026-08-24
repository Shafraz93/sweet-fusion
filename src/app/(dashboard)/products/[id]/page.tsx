import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/actions/products";
import { calculateProfitMetrics } from "@/lib/costing";
import { PageHeader } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, toNumber } from "@/lib/utils";
import { unitLabel, PRODUCT_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const costPerUnit = toNumber(product.averageCost);
  const profit = calculateProfitMetrics(
    toNumber(product.sellingPrice),
    toNumber(product.wholesalePrice),
    costPerUnit
  );

  return (
    <>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} · ${product.category.name}`}
        action={
          <div className="flex gap-2">
            <Link href={`/products/${id}/edit`}>
              <Button variant="outline">Edit Product</Button>
            </Link>
            <Link href={`/products/${id}/traceability`}>
              <Button variant="outline">View Traceability</Button>
            </Link>
          </div>
        }
      />

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
              <p className="text-sm text-slate-500">Current Stock</p>
              <p className="font-semibold">
                {toNumber(product.currentStock)} {unitLabel(product.unit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Selling Price</p>
              <p className="font-semibold">{formatCurrency(product.sellingPrice)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Wholesale Price</p>
              <p className="font-semibold">{formatCurrency(product.wholesalePrice)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Average Cost</p>
              <p className="font-semibold">{formatCurrency(product.averageCost)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Min Stock Level</p>
              <p className="font-semibold">
                {toNumber(product.minStockLevel)} {unitLabel(product.unit)}
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
            <div className="flex justify-between">
              <span className="text-slate-500">Retail Profit</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(profit.retailProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Retail Margin</span>
              <span>{profit.retailMargin.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Wholesale Profit</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(profit.wholesaleProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Wholesale Margin</span>
              <span>{profit.wholesaleMargin.toFixed(1)}%</span>
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

      {product.productLots.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Product Lots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {product.productLots.map((lot) => (
                <div
                  key={lot.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{lot.lotNumber}</p>
                    <p className="text-xs text-slate-500">
                      Source: {lot.sourceType} · {toNumber(lot.remainingQuantity)}/
                      {toNumber(lot.initialQuantity)} remaining
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(lot.unitCost)}/unit</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
