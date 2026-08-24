import Link from "next/link";
import { getPayments, getOutstandingBalances } from "@/lib/actions/payments-expenses";
import { PageHeader, Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [payments, balances] = await Promise.all([
    getPayments(),
    getOutstandingBalances(),
  ]);

  const totalSupplierOutstanding = balances.supplierBalances.reduce(
    (s, b) => s + b.balance,
    0
  );
  const totalCustomerOutstanding = balances.customerBalances.reduce(
    (s, b) => s + b.balance,
    0
  );

  return (
    <>
      <PageHeader
        title="Payments"
        description="Payment history and outstanding balances"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Supplier Outstanding</p>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(totalSupplierOutstanding)}
            </p>
            <p className="text-xs text-slate-500">
              {balances.supplierBalances.length} suppliers with balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Customer Outstanding</p>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(totalCustomerOutstanding)}
            </p>
            <p className="text-xs text-slate-500">
              {balances.customerBalances.length} customers with balance
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Supplier Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {balances.supplierBalances.length === 0 ? (
              <p className="text-sm text-slate-500">No outstanding supplier balances.</p>
            ) : (
              <div className="space-y-2">
                {balances.supplierBalances.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2"
                  >
                    <Link
                      href={`/suppliers/${b.id}`}
                      className="font-medium text-rose-600 hover:underline"
                    >
                      {b.name}
                    </Link>
                    <span className="font-semibold">{formatCurrency(b.balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {balances.customerBalances.length === 0 ? (
              <p className="text-sm text-slate-500">No outstanding customer balances.</p>
            ) : (
              <div className="space-y-2">
                {balances.customerBalances.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2"
                  >
                    <Link
                      href={`/customers/${b.id}`}
                      className="font-medium text-rose-600 hover:underline"
                    >
                      {b.name}
                    </Link>
                    <span className="font-semibold">{formatCurrency(b.balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState title="No payments recorded" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Number</TH>
                  <TH>Date</TH>
                  <TH>Entity</TH>
                  <TH>Type</TH>
                  <TH>Amount</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {payments.map((payment) => (
                  <TR key={payment.id}>
                    <TD className="font-medium">{payment.paymentNumber}</TD>
                    <TD>{formatDate(payment.paymentDate)}</TD>
                    <TD>
                      {payment.supplier?.name ?? payment.customer?.name ?? "—"}
                    </TD>
                    <TD>
                      <Badge variant="info">{payment.entityType}</Badge>
                    </TD>
                    <TD>{formatCurrency(payment.amount)}</TD>
                    <TD>
                      <EditLink href={`/payments/${payment.id}/edit`} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
