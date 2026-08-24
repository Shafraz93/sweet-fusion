import { createCategoryFromForm } from "@/lib/actions/products";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default function NewCategoryPage() {
  return (
    <>
      <PageHeader
        title="Add Category"
        description="Create a product category for organizing your catalog"
      />
      <EntityForm
        title="Category Details"
        cancelHref="/products/categories"
        successHref="/products/categories"
        submitLabel="Create Category"
        fields={[
          { name: "name", label: "Category Name", required: true, placeholder: "e.g. Traditional Sweets" },
          { name: "description", label: "Description", type: "textarea", placeholder: "Optional description" },
        ]}
        onSubmit={createCategoryFromForm}
      />
    </>
  );
}
