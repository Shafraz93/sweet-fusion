import Link from "next/link";
import { Plus } from "lucide-react";
import { getCustomers } from "@/lib/actions/customers";
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
import { CUSTOMER_TYPES } from "@/lib/constants";
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: PageProps<"/customers">) {
  const params = await searchParams;
  const search = params.q as string | undefined;
  const customers = await getCustomers(search);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage retail and shop customers"
        action={
          <Link href="/customers/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </Link>
        }
      />

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add your first customer to start selling"
          action={
            <Link href="/customers/new">
              <Button>Add Customer</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Type</TH>
              <TH>Phone</TH>
              <TH>Orders</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {customers.map((customer) => (
              <TR key={customer.id}>
                <TD>
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium text-rose-600 hover:underline"
                  >
                    {customer.name}
                  </Link>
                </TD>
                <TD>
                  <Badge variant="info">
                    {CUSTOMER_TYPES.find((t) => t.value === customer.type)?.label}
                  </Badge>
                </TD>
                <TD>{customer.phone ?? "—"}</TD>
                <TD>{customer._count.salesOrders}</TD>
                <TD>
                  <EditLink href={`/customers/${customer.id}/edit`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
