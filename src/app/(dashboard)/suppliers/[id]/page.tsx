import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplier } from "@/lib/actions/suppliers";
import { PageHeader, Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { PurchaseItemsList } from "@/components/purchases/purchase-items-list";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
}: PageProps<"/suppliers/[id]">) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <>
      <PageHeader
        title={supplier.name}
        description={supplier.contactPerson ?? "Supplier details"}
        action={
          <div className="flex gap-2">
            <Link href={`/suppliers/${id}/edit`}>
              <Button variant="outline">Edit Supplier</Button>
            </Link>
            <Link href="/purchases/new">
              <Button>Record Purchase</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Purchased</p>
            <p className="text-xl font-bold">{formatCurrency(supplier.totalPurchased)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Outstanding Balance</p>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(supplier.outstandingBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Contact</p>
            <p className="font-medium">{supplier.phone ?? "—"}</p>
            {supplier.whatsapp && (
              <p className="text-sm text-slate-500">WA: {supplier.whatsapp}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {supplier.address && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{supplier.address}</p>
            {supplier.notes && (
              <p className="mt-2 text-sm text-slate-500">{supplier.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.purchases.length === 0 ? (
            <p className="text-sm text-slate-500">No purchases recorded yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Number</TH>
                  <TH>Date</TH>
                  <TH>Items</TH>
                  <TH>Total</TH>
                  <TH>Paid</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {supplier.purchases.map((purchase) => (
                  <TR key={purchase.id}>
                    <TD className="font-medium">{purchase.purchaseNumber}</TD>
                    <TD>{formatDate(purchase.purchaseDate)}</TD>
                    <TD>
                      <PurchaseItemsList items={purchase.items} />
                    </TD>
                    <TD>{formatCurrency(purchase.totalAmount)}</TD>
                    <TD>{formatCurrency(purchase.paidAmount)}</TD>
                    <TD>
                      <PaymentBadge status={purchase.paymentStatus} />
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
