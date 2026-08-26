import Link from "next/link";
import { Plus } from "lucide-react";
import { getProducts, getProductSalesTotals, getSalesSummary } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  PageHeader,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
} from "@/components/ui/table";
import { formatCurrency, toNumber } from "@/lib/utils";
import { unitLabel, PRODUCT_TYPES } from "@/lib/constants";
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const params = await searchParams;
  const search = params.q as string | undefined;
  const [products, salesByProduct, salesSummary] = await Promise.all([
    getProducts(search),
    getProductSalesTotals(),
    getSalesSummary(),
  ]);

  const totalWastedValue = products.reduce(
    (sum, product) =>
      sum + toNumber(product.currentStock) * toNumber(product.averageCost),
    0
  );

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        action={
          <div className="flex gap-2">
            <Link href="/orders">
              <Button variant="outline">View Orders</Button>
            </Link>
            <Link href="/products/categories">
              <Button variant="outline">Categories</Button>
            </Link>
            <Link href="/products/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Profit</p>
            <p className="text-2xl font-bold text-emerald-700">
              {formatCurrency(salesSummary.totalProfit)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              From {formatCurrency(salesSummary.totalRevenue)} sold
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Wasted Value</p>
            <p className="text-2xl font-bold text-amber-700">
              {formatCurrency(totalWastedValue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Unsold stock at average cost
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Sold (all time)</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(salesSummary.totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {salesSummary.orderCount} order{salesSummary.orderCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Items Sold</p>
            <p className="text-2xl font-bold text-slate-900">
              {salesSummary.itemsSold.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">Units across all products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Sales Reports</p>
            <Link
              href="/reports"
              className="mt-2 inline-block text-sm font-medium text-rose-600 hover:underline"
            >
              View detailed reports →
            </Link>
            <p className="mt-1 text-xs text-slate-500">Filter by month or export CSV</p>
          </CardContent>
        </Card>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to get started"
          action={
            <Link href="/products/new">
              <Button>Add Product</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Product</TH>
              <TH>SKU</TH>
              <TH>Category</TH>
              <TH>Type</TH>
              <TH>Wasted</TH>
              <TH>Wasted Value</TH>
              <TH>Sold</TH>
              <TH>Sold Value</TH>
              <TH>Profit</TH>
              <TH>Sell Price</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {products.map((product) => {
              const sold = salesByProduct.get(product.id);
              const wastedQty = toNumber(product.currentStock);
              const wastedValue = wastedQty * toNumber(product.averageCost);
              return (
              <TR key={product.id}>
                <TD>
                  <Link
                    href={`/products/${product.id}`}
                    className="font-medium text-rose-600 hover:underline"
                  >
                    {product.name}
                  </Link>
                </TD>
                <TD>{product.sku}</TD>
                <TD>{product.category.name}</TD>
                <TD>
                  <Badge variant="info">
                    {PRODUCT_TYPES.find((t) => t.value === product.type)?.label}
                  </Badge>
                </TD>
                <TD>
                  {wastedQty > 0
                    ? `${wastedQty} ${unitLabel(product.unit)}`
                    : "—"}
                </TD>
                <TD>
                  {wastedValue > 0 ? formatCurrency(wastedValue) : "—"}
                </TD>
                <TD>
                  {sold && sold.quantity > 0
                    ? `${sold.quantity.toLocaleString()} ${unitLabel(product.unit)}`
                    : "—"}
                </TD>
                <TD>
                  {sold && sold.revenue > 0
                    ? formatCurrency(sold.revenue)
                    : "—"}
                </TD>
                <TD>
                  {sold && sold.profit !== 0
                    ? formatCurrency(sold.profit)
                    : sold && sold.revenue > 0
                      ? formatCurrency(0)
                      : "—"}
                </TD>
                <TD>{formatCurrency(product.sellingPrice)}</TD>
                <TD>
                  <StatusBadge active={product.isActive} />
                </TD>
                <TD>
                  <EditLink href={`/products/${product.id}/edit`} />
                </TD>
              </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
