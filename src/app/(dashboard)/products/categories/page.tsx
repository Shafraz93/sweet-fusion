import Link from "next/link";
import { Plus } from "lucide-react";
import { getCategories } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
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
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <>
      <PageHeader
        title="Product Categories"
        description="Group products like Traditional Sweets, Confectionery, etc."
        action={
          <Link href="/products/categories/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </Link>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create a category before adding products"
          action={
            <Link href="/products/categories/new">
              <Button>Add Category</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Description</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {categories.map((category) => (
              <TR key={category.id}>
                <TD className="font-medium">{category.name}</TD>
                <TD className="text-slate-600">{category.description ?? "—"}</TD>
                <TD>
                  <EditLink href={`/products/categories/${category.id}/edit`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
