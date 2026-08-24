import Link from "next/link";
import { Plus } from "lucide-react";
import { getWholesaleSupplies } from "@/lib/actions/wholesale";
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
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function WholesalePage() {
  const supplies = await getWholesaleSupplies();

  return (
    <>
      <PageHeader
        title="Wholesale"
        description="Wholesale supplies to shops and bulk customers"
        action={
          <Link href="/wholesale/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Supply
            </Button>
          </Link>
        }
      />

      {supplies.length === 0 ? (
        <EmptyState
          title="No wholesale supplies yet"
          description="Record your first wholesale supply"
          action={
            <Link href="/wholesale/new">
              <Button>New Supply</Button>
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
              <TH>Total</TH>
              <TH>Paid</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {supplies.map((supply) => (
              <TR key={supply.id}>
                <TD className="font-medium">{supply.supplyNumber}</TD>
                <TD>{formatDate(supply.supplyDate)}</TD>
                <TD>
                  <Link
                    href={`/customers/${supply.customerId}`}
                    className="text-rose-600 hover:underline"
                  >
                    {supply.customer.name}
                  </Link>
                </TD>
                <TD>{supply.items.length}</TD>
                <TD>{formatCurrency(supply.totalAmount)}</TD>
                <TD>{formatCurrency(supply.paidAmount)}</TD>
                <TD>
                  <PaymentBadge status={supply.paymentStatus} />
                </TD>
                <TD>
                  <EditLink href={`/wholesale/${supply.id}/edit`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
