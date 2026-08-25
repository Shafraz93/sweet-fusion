import { notFound } from "next/navigation";
import { getSalesOrder } from "@/lib/actions/orders";
import { getCustomers } from "@/lib/actions/customers";
import { getProducts } from "@/lib/actions/products";
import { getPackagingMaterials } from "@/lib/actions/packaging-materials";
import { OrderForm } from "@/components/forms/order-form";
import { PageHeader } from "@/components/ui/table";
import { getProductInventoryUnitCost } from "@/lib/inventory";
import { toNumber, normalizeDiscount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({
  params,
}: PageProps<"/orders/[id]/edit">) {
  const { id } = await params;
  const [order, customers, products, packagingMaterials] = await Promise.all([
    getSalesOrder(id),
    getCustomers(),
    getProducts(),
    getPackagingMaterials(),
  ]);
  if (!order) notFound();

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
      <PageHeader
        title={`Edit ${order.orderNumber}`}
        description="Update sales order"
      />
      <OrderForm
        recordId={id}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        products={productsWithCost}
        packagingMaterials={packagingMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
          averageCost: toNumber(m.averageCost),
        }))}
        initialData={{
          customerId: order.customerId,
          orderDate: order.orderDate.toISOString().split("T")[0],
          discount: normalizeDiscount(order.discount),
          paidAmount: toNumber(order.paidAmount),
          notes: order.notes ?? "",
          items: order.items.map((item) => ({
            productId: item.productId,
            quantity: String(toNumber(item.quantity)),
            unit: item.unit,
            unitPrice: String(toNumber(item.unitPrice)),
            packaging: item.packaging.map((pkg) => ({
              packagingMaterialId: pkg.packagingMaterialId,
              quantityUsed: String(toNumber(pkg.quantityUsed)),
              unit: pkg.unit,
            })),
          })),
        }}
      />
    </>
  );
}
