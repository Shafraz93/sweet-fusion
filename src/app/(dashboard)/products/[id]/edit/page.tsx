import { notFound } from "next/navigation";
import { getProduct, getCategories, updateProductFromForm } from "@/lib/actions/products";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { PRODUCT_TYPES, UNITS } from "@/lib/constants";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: PageProps<"/products/[id]/edit">) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProduct(id),
    getCategories(),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader title={`Edit ${product.name}`} description="Update product details" />
      <EntityForm
        title="Product Details"
        cancelHref={`/products/${id}`}
        successHref={`/products/${id}`}
        submitLabel="Update Product"
        fields={[
          { name: "id", label: "ID", type: "hidden", defaultValue: id },
          { name: "name", label: "Product Name", required: true, defaultValue: product.name },
          { name: "sku", label: "SKU / Product Code", required: true, defaultValue: product.sku },
          {
            name: "categoryId",
            label: "Category",
            type: "select",
            required: true,
            defaultValue: product.categoryId,
            options: categories.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: "type",
            label: "Product Type",
            type: "select",
            required: true,
            defaultValue: product.type,
            options: PRODUCT_TYPES.map((t) => ({ value: t.value, label: t.label })),
          },
          {
            name: "unit",
            label: "Unit of Measurement",
            type: "select",
            required: true,
            defaultValue: product.unit,
            options: UNITS.map((u) => ({ value: u.value, label: u.label })),
          },
          {
            name: "sellingPrice",
            label: "Selling Price (Rs.)",
            type: "number",
            step: "0.01",
            defaultValue: toNumber(product.sellingPrice),
          },
          {
            name: "wholesalePrice",
            label: "Wholesale Price (Rs.)",
            type: "number",
            step: "0.01",
            defaultValue: toNumber(product.wholesalePrice),
          },
          {
            name: "minStockLevel",
            label: "Minimum Stock Level",
            type: "number",
            step: "0.001",
            defaultValue: toNumber(product.minStockLevel),
          },
          {
            name: "isActive",
            label: "Product is active",
            type: "checkbox",
            defaultValue: product.isActive,
          },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            defaultValue: product.description ?? "",
          },
        ]}
        onSubmit={updateProductFromForm}
      />
    </>
  );
}
