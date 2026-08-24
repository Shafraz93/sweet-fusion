import Link from "next/link";
import { Plus } from "lucide-react";
import { getProductionBatches } from "@/lib/actions/production";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { unitLabel } from "@/lib/constants";
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const batches = await getProductionBatches();

  return (
    <>
      <PageHeader
        title="Production"
        description="Track production batches and costs"
        action={
          <Link href="/production/new">
            <Button>
              <Plus className="h-4 w-4" />
              Record Production
            </Button>
          </Link>
        }
      />

      {batches.length === 0 ? (
        <EmptyState
          title="No production batches yet"
          description="Record your first production run"
          action={
            <Link href="/production/new">
              <Button>Record Production</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Batch</TH>
              <TH>Date</TH>
              <TH>Product</TH>
              <TH>Output</TH>
              <TH>Total Cost</TH>
              <TH>Cost/Unit</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {batches.map((batch) => (
              <TR key={batch.id}>
                <TD className="font-medium">{batch.batchNumber}</TD>
                <TD>{formatDate(batch.productionDate)}</TD>
                <TD>
                  <Link
                    href={`/products/${batch.productId}`}
                    className="text-rose-600 hover:underline"
                  >
                    {batch.product.name}
                  </Link>
                </TD>
                <TD>
                  {toNumber(batch.outputQuantity)} {unitLabel(batch.outputUnit)}
                </TD>
                <TD>{formatCurrency(batch.totalCost)}</TD>
                <TD>{formatCurrency(batch.costPerUnit)}</TD>
                <TD>
                  <EditLink href={`/production/${batch.id}/edit`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
