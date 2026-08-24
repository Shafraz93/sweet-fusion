import { createPackagingMaterialFromForm } from "@/lib/actions/packaging-materials";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { UNITS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function NewPackagingMaterialPage() {
  return (
    <>
      <PageHeader
        title="Add Packaging Material"
        description="Create a new packaging material"
      />
      <EntityForm
        title="Material Details"
        cancelHref="/packaging"
        fields={[
          { name: "name", label: "Material Name", required: true },
          {
            name: "unit",
            label: "Unit of Measurement",
            type: "select",
            required: true,
            options: UNITS.map((u) => ({ value: u.value, label: u.label })),
          },
          {
            name: "minStockLevel",
            label: "Minimum Stock Level",
            type: "number",
            step: "0.001",
          },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSubmit={createPackagingMaterialFromForm}
      />
    </>
  );
}
