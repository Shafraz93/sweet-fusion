import Link from "next/link";
import { getPackagingOperations } from "@/lib/actions/production";
import { PageHeader, Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { unitLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PackagingOperationsPage() {
  const operations = await getPackagingOperations();

  return (
    <>
      <PageHeader
        title="Packaging Operations"
        description="History of packaging runs"
        action={
          <Link href="/packaging">
            <Button variant="outline">Back to Materials</Button>
          </Link>
        }
      />

      {operations.length === 0 ? (
        <EmptyState
          title="No packaging operations yet"
          description="Packaging operations will appear here when recorded"
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Number</TH>
              <TH>Date</TH>
              <TH>Product</TH>
              <TH>Quantity</TH>
              <TH>Packaging Cost</TH>
              <TH>Cost/Unit</TH>
            </TR>
          </THead>
          <TBody>
            {operations.map((op) => (
              <TR key={op.id}>
                <TD className="font-medium">{op.operationNumber}</TD>
                <TD>{formatDate(op.operationDate)}</TD>
                <TD>{op.product.name}</TD>
                <TD>
                  {toNumber(op.quantity)} {unitLabel(op.unit)}
                </TD>
                <TD>{formatCurrency(op.totalPackagingCost)}</TD>
                <TD>{formatCurrency(op.costPerUnit)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
