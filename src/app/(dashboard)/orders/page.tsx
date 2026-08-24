import Link from "next/link";
import { Plus } from "lucide-react";
import { getSalesOrders } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { PaymentBadge } from "@/components/ui/badge";
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
import { getOrderDisplayTotalCost } from "@/lib/order-cost";
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getSalesOrders();
  const ordersWithCost = await Promise.all(
    orders.map(async (order) => ({
      ...order,
      displayCost: await getOrderDisplayTotalCost(order.items),
    }))
  );

  return (
    <>
      <PageHeader
        title="Orders & Sales"
        description="Retail sales orders and customer transactions"
        action={
          <Link href="/orders/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </Link>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Create your first sales order"
          action={
            <Link href="/orders/new">
              <Button>New Order</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Number</TH>
              <TH>Date</TH>
              <TH>Customer</TH>
              <TH>Items</TH>
              <TH>Cost</TH>
              <TH>Total</TH>
              <TH>Paid</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {ordersWithCost.map((order) => (
              <TR key={order.id}>
                <TD className="font-medium">{order.orderNumber}</TD>
                <TD>{formatDate(order.orderDate)}</TD>
                <TD>
                  <Link
                    href={`/customers/${order.customerId}`}
                    className="text-rose-600 hover:underline"
                  >
                    {order.customer.name}
                  </Link>
                </TD>
                <TD>{order.items.length}</TD>
                <TD>{formatCurrency(order.displayCost)}</TD>
                <TD>{formatCurrency(order.totalAmount)}</TD>
                <TD>{formatCurrency(order.paidAmount)}</TD>
                <TD>
                  <PaymentBadge status={order.paymentStatus} />
                </TD>
                <TD>
                  <EditLink href={`/orders/${order.id}/edit`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
