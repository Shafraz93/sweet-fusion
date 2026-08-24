import { notFound } from "next/navigation";
import { getRawMaterial, updateRawMaterialFromForm } from "@/lib/actions/raw-materials";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { UNITS } from "@/lib/constants";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditRawMaterialPage({
  params,
}: PageProps<"/raw-materials/[id]/edit">) {
  const { id } = await params;
  const material = await getRawMaterial(id);
  if (!material) notFound();

  return (
    <>
      <PageHeader title={`Edit ${material.name}`} description="Update raw material details" />
      <EntityForm
        title="Raw Material Details"
        cancelHref="/raw-materials"
        submitLabel="Update Material"
        fields={[
          { name: "id", label: "ID", type: "hidden", defaultValue: id },
          { name: "name", label: "Name", required: true, defaultValue: material.name },
          { name: "category", label: "Category", defaultValue: material.category ?? "" },
          {
            name: "unit",
            label: "Unit",
            type: "select",
            required: true,
            defaultValue: material.unit,
            options: UNITS.map((u) => ({ value: u.value, label: u.label })),
          },
          {
            name: "minStockLevel",
            label: "Minimum Stock Level",
            type: "number",
            step: "0.001",
            defaultValue: toNumber(material.minStockLevel),
          },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            defaultValue: material.description ?? "",
          },
        ]}
        onSubmit={updateRawMaterialFromForm}
      />
    </>
  );
}
