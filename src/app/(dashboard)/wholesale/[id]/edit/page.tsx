import { notFound } from "next/navigation";
import { getWholesaleSupply } from "@/lib/actions/wholesale";
import { getCustomers } from "@/lib/actions/customers";
import { getProducts } from "@/lib/actions/products";
import { WholesaleForm } from "@/components/forms/wholesale-form";
import { PageHeader } from "@/components/ui/table";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditWholesalePage({
  params,
}: PageProps<"/wholesale/[id]/edit">) {
  const { id } = await params;
  const [supply, customers, products] = await Promise.all([
    getWholesaleSupply(id),
    getCustomers(),
    getProducts(),
  ]);
  if (!supply) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${supply.supplyNumber}`}
        description="Update wholesale supply"
      />
      <WholesaleForm
        recordId={id}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          wholesalePrice: toNumber(p.wholesalePrice),
        }))}
        initialData={{
          customerId: supply.customerId,
          supplyDate: supply.supplyDate.toISOString().split("T")[0],
          dueDate: supply.dueDate?.toISOString().split("T")[0] ?? "",
          paidAmount: toNumber(supply.paidAmount),
          notes: supply.notes ?? "",
          items: supply.items.map((item) => ({
            productId: item.productId,
            quantity: String(toNumber(item.quantity)),
            unit: item.unit,
            unitPrice: String(toNumber(item.unitPrice)),
          })),
        }}
      />
    </>
  );
}
