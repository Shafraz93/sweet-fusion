import { notFound } from "next/navigation";
import { getPurchase } from "@/lib/actions/purchases";
import { getSuppliers } from "@/lib/actions/suppliers";
import { getProducts } from "@/lib/actions/products";
import { getRawMaterials } from "@/lib/actions/raw-materials";
import { getPackagingMaterials } from "@/lib/actions/packaging-materials";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { PageHeader } from "@/components/ui/table";
import { toNumber } from "@/lib/utils";
import { PurchaseItemType } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export default async function EditPurchasePage({
  params,
}: PageProps<"/purchases/[id]/edit">) {
  const { id } = await params;
  const [purchase, suppliers, products, rawMaterials, packagingMaterials] =
    await Promise.all([
      getPurchase(id),
      getSuppliers(),
      getProducts(),
      getRawMaterials(),
      getPackagingMaterials(),
    ]);
  if (!purchase) notFound();

  const items = purchase.items.map((item) => {
    let itemId = "";
    if (item.itemType === PurchaseItemType.FINISHED_PRODUCT) itemId = item.productId ?? "";
    else if (item.itemType === PurchaseItemType.RAW_MATERIAL) itemId = item.rawMaterialId ?? "";
    else if (item.itemType === PurchaseItemType.PACKAGING) itemId = item.packagingMaterialId ?? "";
    return {
      itemType: item.itemType,
      itemId,
      quantity: String(toNumber(item.quantity)),
      unit: item.unit,
      unitCost: String(toNumber(item.unitCost)),
    };
  });

  return (
    <>
      <PageHeader
        title={`Edit ${purchase.purchaseNumber}`}
        description="Update purchase record"
      />
      <PurchaseForm
        recordId={id}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        products={products.map((p) => ({ id: p.id, name: p.name, unit: p.unit }))}
        rawMaterials={rawMaterials.map((m) => ({ id: m.id, name: m.name, unit: m.unit }))}
        packagingMaterials={packagingMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
        }))}
        initialData={{
          supplierId: purchase.supplierId,
          purchaseDate: purchase.purchaseDate.toISOString().split("T")[0],
          invoiceRef: purchase.invoiceRef ?? "",
          paidAmount: toNumber(purchase.paidAmount),
          notes: purchase.notes ?? "",
          items,
        }}
      />
    </>
  );
}
