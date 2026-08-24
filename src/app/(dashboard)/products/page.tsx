import Link from "next/link";
import { Plus } from "lucide-react";
import { getProducts } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
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
  const products = await getProducts(search);

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        action={
          <div className="flex gap-2">
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
              <TH>Stock</TH>
              <TH>Sell Price</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {products.map((product) => (
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
                  {toNumber(product.currentStock)} {unitLabel(product.unit)}
                </TD>
                <TD>{formatCurrency(product.sellingPrice)}</TD>
                <TD>
                  <StatusBadge active={product.isActive} />
                </TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <EditLink href={`/products/${product.id}/edit`} />
                    <Link
                      href={`/products/${product.id}/traceability`}
                      className="text-sm text-slate-500 hover:text-rose-600"
                    >
                      Trace
                    </Link>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
