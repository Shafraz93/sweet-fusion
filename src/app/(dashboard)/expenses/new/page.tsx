import { createExpenseFromForm } from "@/lib/actions/payments-expenses";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function NewExpensePage() {
  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <PageHeader title="Add Expense" description="Record a new business expense" />
      <EntityForm
        title="Expense Details"
        cancelHref="/expenses"
        fields={[
          {
            name: "expenseDate",
            label: "Expense Date",
            type: "date",
            required: true,
            defaultValue: today,
          },
          {
            name: "category",
            label: "Category",
            type: "select",
            required: true,
            options: EXPENSE_CATEGORIES.map((c) => ({
              value: c.value,
              label: c.label,
            })),
          },
          {
            name: "amount",
            label: "Amount (Rs.)",
            type: "number",
            step: "0.01",
            required: true,
          },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            required: true,
          },
        ]}
        onSubmit={createExpenseFromForm}
      />
    </>
  );
}
