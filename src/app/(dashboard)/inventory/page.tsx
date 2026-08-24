import { getInventoryOverview } from "@/lib/actions/inventory";
import { InventoryTabs } from "@/components/forms/inventory-tabs";
import { PageHeader } from "@/components/ui/table";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const data = await getInventoryOverview();

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock levels across finished products, raw materials, and packaging"
      />
      <InventoryTabs
        products={data.products.map((p) => ({
          id: p.id,
          name: p.name,
          currentStock: toNumber(p.currentStock),
          unit: p.unit,
          averageCost: toNumber(p.averageCost),
          minStockLevel: toNumber(p.minStockLevel),
          category: p.category,
        }))}
        rawMaterials={data.rawMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          currentStock: toNumber(m.currentStock),
          unit: m.unit,
          averageCost: toNumber(m.averageCost),
          minStockLevel: toNumber(m.minStockLevel),
        }))}
        packagingMaterials={data.packagingMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          currentStock: toNumber(m.currentStock),
          unit: m.unit,
          averageCost: toNumber(m.averageCost),
          minStockLevel: toNumber(m.minStockLevel),
        }))}
        recentMovements={data.recentMovements.map((m) => ({
          id: m.id,
          itemName: m.itemName,
          itemType: m.itemType,
          movementType: m.movementType,
          quantity: toNumber(m.quantity),
          unit: m.unit,
          movementDate: m.movementDate,
        }))}
        lowStock={data.lowStock}
        totalValue={data.totalValue}
      />
    </>
  );
}
