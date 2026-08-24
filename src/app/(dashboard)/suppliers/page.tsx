import Link from "next/link";
import { Plus } from "lucide-react";
import { getSuppliers } from "@/lib/actions/suppliers";
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
import { formatCurrency, toNumber } from "@/lib/utils";
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: PageProps<"/suppliers">) {
  const params = await searchParams;
  const search = params.q as string | undefined;
  const suppliers = await getSuppliers(search);

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Manage your supplier contacts"
        action={
          <Link href="/suppliers/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          </Link>
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          description="Add your first supplier to track purchases"
          action={
            <Link href="/suppliers/new">
              <Button>Add Supplier</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Contact</TH>
              <TH>Phone</TH>
              <TH>Purchases</TH>
              <TH>Recent Purchase</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {suppliers.map((supplier) => (
              <TR key={supplier.id}>
                <TD>
                  <Link
                    href={`/suppliers/${supplier.id}`}
                    className="font-medium text-rose-600 hover:underline"
                  >
                    {supplier.name}
                  </Link>
                </TD>
                <TD>{supplier.contactPerson ?? "—"}</TD>
                <TD>{supplier.phone ?? "—"}</TD>
                <TD>{supplier._count.purchases}</TD>
                <TD>
                  {supplier.purchases[0]
                    ? formatCurrency(supplier.purchases[0].totalAmount)
                    : "—"}
                </TD>
                <TD>
                  <EditLink href={`/suppliers/${supplier.id}/edit`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
