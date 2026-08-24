import { createSupplierFromForm } from "@/lib/actions/suppliers";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader title="Add Supplier" description="Create a new supplier" />
      <EntityForm
        title="Supplier Details"
        cancelHref="/suppliers"
        fields={[
          { name: "name", label: "Supplier Name", required: true },
          { name: "contactPerson", label: "Contact Person" },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "whatsapp", label: "WhatsApp", type: "tel" },
          { name: "address", label: "Address", type: "textarea" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={createSupplierFromForm}
      />
    </>
  );
}
