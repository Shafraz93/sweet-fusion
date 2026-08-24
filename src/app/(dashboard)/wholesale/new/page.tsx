import { getCustomers } from "@/lib/actions/customers";
import { getProducts } from "@/lib/actions/products";
import { WholesaleForm } from "@/components/forms/wholesale-form";
import { PageHeader } from "@/components/ui/table";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewWholesalePage() {
  const [customers, products] = await Promise.all([
    getCustomers(undefined, "WHOLESALE"),
    getProducts(),
  ]);

  const customerList =
    customers.length > 0
      ? customers
      : await getCustomers();

  return (
    <>
      <PageHeader
        title="New Wholesale Supply"
        description="Record a wholesale supply to a customer"
      />
      <WholesaleForm
        customers={customerList.map((c) => ({ id: c.id, name: c.name }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          wholesalePrice: toNumber(p.wholesalePrice),
        }))}
      />
    </>
  );
}
