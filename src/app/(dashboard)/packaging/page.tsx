import Link from "next/link";
import { Plus } from "lucide-react";
import { getPackagingMaterials } from "@/lib/actions/packaging-materials";
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
import { formatCurrency, toNumber } from "@/lib/utils";
import { unitLabel } from "@/lib/constants";
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function PackagingPage({
  searchParams,
}: PageProps<"/packaging">) {
  const params = await searchParams;
  const search = params.q as string | undefined;
  const materials = await getPackagingMaterials(search);

  return (
    <>
      <PageHeader
        title="Packaging Materials"
        description="Manage packaging supplies and operations"
        action={
          <div className="flex gap-2">
            <Link href="/packaging/operations">
              <Button variant="outline">Operations</Button>
            </Link>
            <Link href="/packaging/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add Material
              </Button>
            </Link>
          </div>
        }
      />

      {materials.length === 0 ? (
        <EmptyState
          title="No packaging materials yet"
          description="Add packaging materials for your products"
          action={
            <Link href="/packaging/new">
              <Button>Add Material</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Stock</TH>
              <TH>Avg Cost</TH>
              <TH>Min Level</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {materials.map((material) => {
              const stock = toNumber(material.currentStock);
              const min = toNumber(material.minStockLevel);
              const isLow = stock <= min;
              return (
                <TR key={material.id}>
                  <TD className="font-medium">{material.name}</TD>
                  <TD>
                    {stock} {unitLabel(material.unit)}
                  </TD>
                  <TD>{formatCurrency(material.averageCost)}</TD>
                  <TD>
                    {min} {unitLabel(material.unit)}
                  </TD>
                  <TD>
                    {isLow ? (
                      <Badge variant="warning">Low Stock</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </TD>
                  <TD>
                    <EditLink href={`/packaging/${material.id}/edit`} />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
