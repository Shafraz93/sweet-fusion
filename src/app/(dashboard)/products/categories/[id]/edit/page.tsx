import { notFound } from "next/navigation";
import { getCategories, updateCategoryFromForm } from "@/lib/actions/products";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: PageProps<"/products/categories/[id]/edit">) {
  const { id } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  return (
    <>
      <PageHeader title={`Edit ${category.name}`} description="Update category details" />
      <EntityForm
        title="Category Details"
        cancelHref="/products/categories"
        successHref="/products/categories"
        submitLabel="Update Category"
        fields={[
          { name: "id", label: "ID", type: "hidden", defaultValue: id },
          { name: "name", label: "Category Name", required: true, defaultValue: category.name },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            defaultValue: category.description ?? "",
          },
        ]}
        onSubmit={updateCategoryFromForm}
      />
    </>
  );
}
