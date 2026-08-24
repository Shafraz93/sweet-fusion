import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/actions/customers";
import { PageHeader, Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CUSTOMER_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title={customer.name}
        description={
          CUSTOMER_TYPES.find((t) => t.value === customer.type)?.label ?? ""
        }
        action={
          <div className="flex gap-2">
            <Link href={`/customers/${id}/edit`}>
              <Button variant="outline">Edit Customer</Button>
            </Link>
            <Link href="/orders/new">
              <Button variant="outline">New Order</Button>
            </Link>
            <Link href="/wholesale/new">
              <Button>New Wholesale</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Purchases</p>
            <p className="text-xl font-bold">{formatCurrency(customer.totalPurchases)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Outstanding Balance</p>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(customer.outstandingBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Contact</p>
            <p className="font-medium">{customer.phone ?? "—"}</p>
            <Badge variant="info" className="mt-2">
              {CUSTOMER_TYPES.find((t) => t.value === customer.type)?.label}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.salesOrders.length === 0 ? (
              <p className="text-sm text-slate-500">No orders yet.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Number</TH>
                    <TH>Date</TH>
                    <TH>Total</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {customer.salesOrders.map((order) => (
                    <TR key={order.id}>
                      <TD>{order.orderNumber}</TD>
                      <TD>{formatDate(order.orderDate)}</TD>
                      <TD>{formatCurrency(order.totalAmount)}</TD>
                      <TD>
                        <PaymentBadge status={order.paymentStatus} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wholesale Supplies</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.wholesaleSupplies.length === 0 ? (
              <p className="text-sm text-slate-500">No wholesale supplies yet.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Number</TH>
                    <TH>Date</TH>
                    <TH>Total</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {customer.wholesaleSupplies.map((supply) => (
                    <TR key={supply.id}>
                      <TD>{supply.supplyNumber}</TD>
                      <TD>{formatDate(supply.supplyDate)}</TD>
                      <TD>{formatCurrency(supply.totalAmount)}</TD>
                      <TD>
                        <PaymentBadge status={supply.paymentStatus} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
