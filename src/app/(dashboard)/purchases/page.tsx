import Link from "next/link";
import { Plus } from "lucide-react";
import { getPurchases } from "@/lib/actions/purchases";
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
import { PurchaseItemsList } from "@/components/purchases/purchase-items-list";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const purchases = await getPurchases();

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Track supplier purchases and payments"
        action={
          <Link href="/purchases/new">
            <Button>
              <Plus className="h-4 w-4" />
              Record Purchase
            </Button>
          </Link>
        }
      />

      {purchases.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          description="Record your first purchase from a supplier"
          action={
            <Link href="/purchases/new">
              <Button>Record Purchase</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Number</TH>
              <TH>Date</TH>
              <TH>Supplier</TH>
              <TH>Items</TH>
              <TH>Total</TH>
              <TH>Paid</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {purchases.map((purchase) => (
              <TR key={purchase.id}>
                <TD className="font-medium">{purchase.purchaseNumber}</TD>
                <TD>{formatDate(purchase.purchaseDate)}</TD>
                <TD>
                  <Link
                    href={`/suppliers/${purchase.supplierId}`}
                    className="text-rose-600 hover:underline"
                  >
                    {purchase.supplier.name}
                  </Link>
                </TD>
                <TD>
                  <PurchaseItemsList items={purchase.items} />
                </TD>
                <TD>{formatCurrency(purchase.totalAmount)}</TD>
                <TD>{formatCurrency(purchase.paidAmount)}</TD>
                <TD>
                  <PaymentBadge status={purchase.paymentStatus} />
                </TD>
                <TD>
                  <EditLink href={`/purchases/${purchase.id}/edit`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
