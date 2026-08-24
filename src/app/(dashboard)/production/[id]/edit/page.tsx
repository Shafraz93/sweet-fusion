import { notFound } from "next/navigation";
import { getProductionBatch, updateProductionBatchFromForm } from "@/lib/actions/production";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditProductionPage({
  params,
}: PageProps<"/production/[id]/edit">) {
  const { id } = await params;
  const batch = await getProductionBatch(id);
  if (!batch) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${batch.batchNumber}`}
        description={`Update production batch for ${batch.product.name}`}
      />
      <EntityForm
        title="Production Batch"
        cancelHref="/production"
        submitLabel="Update Batch"
        fields={[
          { name: "id", label: "ID", type: "hidden", defaultValue: id },
          {
            name: "productionDate",
            label: "Production Date",
            type: "date",
            required: true,
            defaultValue: batch.productionDate.toISOString().split("T")[0],
          },
          {
            name: "labourCost",
            label: "Labour Cost (Rs.)",
            type: "number",
            step: "0.01",
            defaultValue: toNumber(batch.labourCost),
          },
          {
            name: "otherCost",
            label: "Other Costs (Rs.)",
            type: "number",
            step: "0.01",
            defaultValue: toNumber(batch.otherCost),
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            defaultValue: batch.notes ?? "",
          },
        ]}
        onSubmit={updateProductionBatchFromForm}
      />
      <p className="mt-4 max-w-2xl text-sm text-slate-500">
        Ingredient quantities and output cannot be changed after production to preserve
        inventory accuracy. Create a new batch if quantities need adjustment.
      </p>
    </>
  );
}
