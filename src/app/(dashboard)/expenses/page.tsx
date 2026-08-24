import Link from "next/link";
import { Plus } from "lucide-react";
import { getExpenses } from "@/lib/actions/payments-expenses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PageHeader,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await getExpenses();

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track business expenses and overheads"
        action={
          <Link href="/expenses/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </Link>
        }
      />

      {expenses.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          description="Record your first business expense"
          action={
            <Link href="/expenses/new">
              <Button>Add Expense</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Category</TH>
              <TH>Description</TH>
              <TH>Amount</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {expenses.map((expense) => (
              <TR key={expense.id}>
                <TD>{formatDate(expense.expenseDate)}</TD>
                <TD>
                  <Badge variant="info">
                    {EXPENSE_CATEGORIES.find((c) => c.value === expense.category)
                      ?.label ?? expense.category}
                  </Badge>
                </TD>
                <TD>{expense.description}</TD>
                <TD className="font-medium">{formatCurrency(expense.amount)}</TD>
                <TD>
                  <EditLink href={`/expenses/${expense.id}/edit`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
