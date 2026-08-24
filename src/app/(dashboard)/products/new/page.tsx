import Link from "next/link";
import {
  getCategories,
  createProductFromForm,
} from "@/lib/actions/products";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { PRODUCT_TYPES, UNITS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getCategories();

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  if (categoryOptions.length === 0) {
    categoryOptions.push({ value: "", label: "No categories — add one first" });
  }

  return (
    <>
      <PageHeader title="Add Product" description="Create a new product" />
      {categories.length === 0 && (
        <p className="mb-4 text-sm text-amber-800">
          You need at least one category.{" "}
          <Link href="/products/categories/new" className="font-medium text-rose-600 hover:underline">
            Add a category first
          </Link>
        </p>
      )}
      <EntityForm
        title="Product Details"
        cancelHref="/products"
        fields={[
          { name: "name", label: "Product Name", required: true },
          { name: "sku", label: "SKU / Product Code", required: true },
          {
            name: "categoryId",
            label: "Category",
            type: "select",
            required: true,
            options: categoryOptions,
          },
          {
            name: "type",
            label: "Product Type",
            type: "select",
            required: true,
            options: PRODUCT_TYPES.map((t) => ({ value: t.value, label: t.label })),
          },
          {
            name: "unit",
            label: "Unit of Measurement",
            type: "select",
            required: true,
            options: UNITS.map((u) => ({ value: u.value, label: u.label })),
          },
          { name: "sellingPrice", label: "Selling Price (Rs.)", type: "number", step: "0.01" },
          { name: "wholesalePrice", label: "Wholesale Price (Rs.)", type: "number", step: "0.01" },
          { name: "minStockLevel", label: "Minimum Stock Level", type: "number", step: "0.001" },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSubmit={createProductFromForm}
      />
    </>
  );
}
