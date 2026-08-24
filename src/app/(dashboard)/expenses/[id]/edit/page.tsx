import { notFound } from "next/navigation";
import { getExpense, updateExpenseFromForm } from "@/lib/actions/payments-expenses";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
}: PageProps<"/expenses/[id]/edit">) {
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  return (
    <>
      <PageHeader title="Edit Expense" description="Update expense record" />
      <EntityForm
        title="Expense Details"
        cancelHref="/expenses"
        submitLabel="Update Expense"
        fields={[
          { name: "id", label: "ID", type: "hidden", defaultValue: id },
          {
            name: "expenseDate",
            label: "Expense Date",
            type: "date",
            required: true,
            defaultValue: expense.expenseDate.toISOString().split("T")[0],
          },
          {
            name: "category",
            label: "Category",
            type: "select",
            required: true,
            defaultValue: expense.category,
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
            defaultValue: toNumber(expense.amount),
          },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            required: true,
            defaultValue: expense.description,
          },
          {
            name: "includeInProductionCost",
            label: "Include in production cost",
            type: "checkbox",
            defaultValue: expense.includeInProductionCost,
          },
        ]}
        onSubmit={updateExpenseFromForm}
      />
    </>
  );
}
