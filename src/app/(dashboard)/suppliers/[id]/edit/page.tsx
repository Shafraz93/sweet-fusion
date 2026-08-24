import { notFound } from "next/navigation";
import { getSupplier, updateSupplierFromForm } from "@/lib/actions/suppliers";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({
  params,
}: PageProps<"/suppliers/[id]/edit">) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <>
      <PageHeader title={`Edit ${supplier.name}`} description="Update supplier details" />
      <EntityForm
        title="Supplier Details"
        cancelHref={`/suppliers/${id}`}
        successHref={`/suppliers/${id}`}
        submitLabel="Update Supplier"
        fields={[
          { name: "id", label: "ID", type: "hidden", defaultValue: id },
          { name: "name", label: "Supplier Name", required: true, defaultValue: supplier.name },
          { name: "contactPerson", label: "Contact Person", defaultValue: supplier.contactPerson ?? "" },
          { name: "phone", label: "Phone", type: "tel", defaultValue: supplier.phone ?? "" },
          { name: "whatsapp", label: "WhatsApp", type: "tel", defaultValue: supplier.whatsapp ?? "" },
          { name: "address", label: "Address", type: "textarea", defaultValue: supplier.address ?? "" },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: supplier.notes ?? "" },
        ]}
        onSubmit={updateSupplierFromForm}
      />
    </>
  );
}
