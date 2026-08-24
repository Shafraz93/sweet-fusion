import { getCustomers } from "@/lib/actions/customers";
import { getProducts } from "@/lib/actions/products";
import { getPackagingMaterials } from "@/lib/actions/packaging-materials";
import { OrderForm } from "@/components/forms/order-form";
import { PageHeader } from "@/components/ui/table";
import { getProductInventoryUnitCost } from "@/lib/inventory";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [customers, products, packagingMaterials] = await Promise.all([
    getCustomers(),
    getProducts(),
    getPackagingMaterials(),
  ]);

  const productsWithCost = await Promise.all(
    products.map(async (p) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      sellingPrice: toNumber(p.sellingPrice),
      unitCost: await getProductInventoryUnitCost(p.id),
    }))
  );

  return (
    <>
      <PageHeader title="New Order" description="Create a retail sales order" />
      <OrderForm
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        products={productsWithCost}
        packagingMaterials={packagingMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
          averageCost: toNumber(m.averageCost),
        }))}
      />
    </>
  );
}
