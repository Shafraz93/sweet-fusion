import { createCustomerFromForm } from "@/lib/actions/customers";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { CUSTOMER_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="Add Customer" description="Create a new customer" />
      <EntityForm
        title="Customer Details"
        cancelHref="/customers"
        fields={[
          { name: "name", label: "Customer Name", required: true },
          {
            name: "type",
            label: "Customer Type",
            type: "select",
            required: true,
            options: CUSTOMER_TYPES.map((t) => ({ value: t.value, label: t.label })),
          },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "whatsapp", label: "WhatsApp", type: "tel" },
          { name: "address", label: "Address", type: "textarea" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={createCustomerFromForm}
      />
    </>
  );
}
