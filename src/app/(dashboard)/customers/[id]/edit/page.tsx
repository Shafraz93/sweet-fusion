import { notFound } from "next/navigation";
import { getCustomer, updateCustomerFromForm } from "@/lib/actions/customers";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { CUSTOMER_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: PageProps<"/customers/[id]/edit">) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <>
      <PageHeader title={`Edit ${customer.name}`} description="Update customer details" />
      <EntityForm
        title="Customer Details"
        cancelHref={`/customers/${id}`}
        successHref={`/customers/${id}`}
        submitLabel="Update Customer"
        fields={[
          { name: "id", label: "ID", type: "hidden", defaultValue: id },
          { name: "name", label: "Customer Name", required: true, defaultValue: customer.name },
          { name: "phone", label: "Phone", type: "tel", defaultValue: customer.phone ?? "" },
          { name: "whatsapp", label: "WhatsApp", type: "tel", defaultValue: customer.whatsapp ?? "" },
          { name: "address", label: "Address", type: "textarea", defaultValue: customer.address ?? "" },
          {
            name: "type",
            label: "Customer Type",
            type: "select",
            required: true,
            defaultValue: customer.type,
            options: CUSTOMER_TYPES.map((t) => ({ value: t.value, label: t.label })),
          },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: customer.notes ?? "" },
        ]}
        onSubmit={updateCustomerFromForm}
      />
    </>
  );
}
