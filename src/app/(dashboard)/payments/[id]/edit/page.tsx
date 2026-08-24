import { notFound } from "next/navigation";
import { getPayment, updatePaymentFromForm } from "@/lib/actions/payments-expenses";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditPaymentPage({
  params,
}: PageProps<"/payments/[id]/edit">) {
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();

  const entityName =
    payment.supplier?.name ?? payment.customer?.name ?? "Payment";

  return (
    <>
      <PageHeader
        title={`Edit ${payment.paymentNumber}`}
        description={`Payment for ${entityName}`}
      />
      <EntityForm
        title="Payment Details"
        cancelHref="/payments"
        submitLabel="Update Payment"
        fields={[
          { name: "id", label: "ID", type: "hidden", defaultValue: id },
          {
            name: "amount",
            label: "Amount (Rs.)",
            type: "number",
            step: "0.01",
            required: true,
            defaultValue: toNumber(payment.amount),
          },
          {
            name: "paymentDate",
            label: "Payment Date",
            type: "date",
            required: true,
            defaultValue: payment.paymentDate.toISOString().split("T")[0],
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            defaultValue: payment.notes ?? "",
          },
        ]}
        onSubmit={updatePaymentFromForm}
      />
    </>
  );
}
