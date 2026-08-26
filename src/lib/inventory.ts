import {
  InventoryItemType,
  StockMovementType,
  UnitOfMeasure,
} from "@/generated/prisma";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

interface MovementInput {
  itemType: InventoryItemType;
  itemId: string;
  itemName: string;
  movementType: StockMovementType;
  quantity: number;
  unit: UnitOfMeasure;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  movementDate?: Date;
}

export const getAllowNegativeInventory = cache(async (): Promise<boolean> => {
  const settings = await prisma.appSettings.findFirst();
  return settings?.allowNegativeInventory ?? false;
});

export async function recordInventoryMovement(input: MovementInput) {
  const totalCost = Math.abs(input.quantity) * (input.unitCost ?? 0);

  return prisma.inventoryMovement.create({
    data: {
      itemType: input.itemType,
      itemId: input.itemId,
      itemName: input.itemName,
      movementType: input.movementType,
      quantity: input.quantity,
      unit: input.unit,
      unitCost: input.unitCost ?? 0,
      totalCost,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      notes: input.notes,
      movementDate: input.movementDate ?? new Date(),
    },
  });
}

export async function updateRawMaterialStock(
  rawMaterialId: string,
  quantityChange: number,
  movement: Omit<MovementInput, "itemType" | "itemId" | "itemName" | "quantity">
) {
  const material = await prisma.rawMaterial.findUniqueOrThrow({
    where: { id: rawMaterialId },
  });

  const newStock = toNumber(material.currentStock) + quantityChange;
  const allowNegative = await getAllowNegativeInventory();

  if (!allowNegative && newStock < 0) {
    throw new Error(
      `Insufficient stock for ${material.name}. Available: ${toNumber(material.currentStock)}`
    );
  }

  await prisma.rawMaterial.update({
    where: { id: rawMaterialId },
    data: { currentStock: newStock },
  });

  await recordInventoryMovement({
    itemType: InventoryItemType.RAW_MATERIAL,
    itemId: rawMaterialId,
    itemName: material.name,
    quantity: quantityChange,
    ...movement,
  });

  return newStock;
}

export async function updatePackagingMaterialStock(
  packagingMaterialId: string,
  quantityChange: number,
  movement: Omit<MovementInput, "itemType" | "itemId" | "itemName" | "quantity">
) {
  const material = await prisma.packagingMaterial.findUniqueOrThrow({
    where: { id: packagingMaterialId },
  });

  const newStock = toNumber(material.currentStock) + quantityChange;
  const allowNegative = await getAllowNegativeInventory();

  if (!allowNegative && newStock < 0) {
    throw new Error(
      `Insufficient packaging stock for ${material.name}. Available: ${toNumber(material.currentStock)}`
    );
  }

  await prisma.packagingMaterial.update({
    where: { id: packagingMaterialId },
    data: { currentStock: newStock },
  });

  await recordInventoryMovement({
    itemType: InventoryItemType.PACKAGING,
    itemId: packagingMaterialId,
    itemName: material.name,
    quantity: quantityChange,
    ...movement,
  });

  return newStock;
}

export async function updateProductStock(
  productId: string,
  quantityChange: number,
  movement: Omit<MovementInput, "itemType" | "itemId" | "itemName" | "quantity">
) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });

  const newStock = toNumber(product.currentStock) + quantityChange;
  const allowNegative = await getAllowNegativeInventory();

  if (!allowNegative && newStock < 0) {
    throw new Error(
      `Insufficient stock for ${product.name}. Available: ${toNumber(product.currentStock)}`
    );
  }

  await prisma.product.update({
    where: { id: productId },
    data: { currentStock: newStock },
  });

  await recordInventoryMovement({
    itemType: InventoryItemType.FINISHED_PRODUCT,
    itemId: productId,
    itemName: product.name,
    quantity: quantityChange,
    ...movement,
  });

  return newStock;
}

export async function updateAverageCost(
  currentStock: number,
  currentAvgCost: number,
  addedQty: number,
  addedUnitCost: number
): Promise<number> {
  if (currentStock + addedQty <= 0) return addedUnitCost;
  const totalValue = currentStock * currentAvgCost + addedQty * addedUnitCost;
  return totalValue / (currentStock + addedQty);
}

/** Weighted average unit cost from open inventory lots. */
export async function getProductInventoryUnitCost(
  productId: string
): Promise<number> {
  const openLots = await prisma.productLot.findMany({
    where: { productId, remainingQuantity: { gt: 0 } },
  });

  if (openLots.length > 0) {
    let totalQty = 0;
    let totalValue = 0;
    for (const lot of openLots) {
      const qty = toNumber(lot.remainingQuantity);
      totalQty += qty;
      totalValue += qty * toNumber(lot.unitCost);
    }
    if (totalQty > 0) return totalValue / totalQty;
  }

  const latestLot = await prisma.productLot.findFirst({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });
  if (latestLot) return toNumber(latestLot.unitCost);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  return toNumber(product?.averageCost);
}

/** Batch unit costs for multiple products (one round-trip per lot tier). */
export async function getProductInventoryUnitCosts(
  productIds: string[]
): Promise<Map<string, number>> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  const costs = new Map<string, number>();
  if (uniqueIds.length === 0) return costs;

  const openLots = await prisma.productLot.findMany({
    where: { productId: { in: uniqueIds }, remainingQuantity: { gt: 0 } },
  });

  const lotsByProduct = new Map<string, typeof openLots>();
  for (const lot of openLots) {
    const list = lotsByProduct.get(lot.productId) ?? [];
    list.push(lot);
    lotsByProduct.set(lot.productId, list);
  }

  const missingIds: string[] = [];
  for (const id of uniqueIds) {
    const lots = lotsByProduct.get(id);
    if (lots && lots.length > 0) {
      let totalQty = 0;
      let totalValue = 0;
      for (const lot of lots) {
        const qty = toNumber(lot.remainingQuantity);
        totalQty += qty;
        totalValue += qty * toNumber(lot.unitCost);
      }
      if (totalQty > 0) {
        costs.set(id, totalValue / totalQty);
        continue;
      }
    }
    missingIds.push(id);
  }

  if (missingIds.length > 0) {
    const latestLots = await prisma.productLot.findMany({
      where: { productId: { in: missingIds } },
      orderBy: { createdAt: "desc" },
    });
    const seen = new Set<string>();
    for (const lot of latestLots) {
      if (seen.has(lot.productId)) continue;
      seen.add(lot.productId);
      costs.set(lot.productId, toNumber(lot.unitCost));
    }

    const stillMissing = missingIds.filter((id) => !costs.has(id));
    if (stillMissing.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: stillMissing } },
      });
      for (const product of products) {
        costs.set(product.id, toNumber(product.averageCost));
      }
    }
  }

  return costs;
}

/** Keep product.averageCost aligned with lot inventory. */
export async function syncProductAverageCostFromLots(
  productId: string
): Promise<number> {
  const unitCost = await getProductInventoryUnitCost(productId);
  await prisma.product.update({
    where: { id: productId },
    data: { averageCost: unitCost },
  });
  return unitCost;
}

export async function getLowStockAlerts() {
  const [products, rawMaterials, packagingMaterials] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
    }),
    prisma.rawMaterial.findMany(),
    prisma.packagingMaterial.findMany(),
  ]);

  const alerts = [
    ...products
      .filter((p) => toNumber(p.currentStock) <= toNumber(p.minStockLevel))
      .map((p) => ({
        type: "FINISHED_PRODUCT" as const,
        id: p.id,
        name: p.name,
        current: toNumber(p.currentStock),
        minimum: toNumber(p.minStockLevel),
        unit: p.unit,
      })),
    ...rawMaterials
      .filter((r) => toNumber(r.currentStock) <= toNumber(r.minStockLevel))
      .map((r) => ({
        type: "RAW_MATERIAL" as const,
        id: r.id,
        name: r.name,
        current: toNumber(r.currentStock),
        minimum: toNumber(r.minStockLevel),
        unit: r.unit,
      })),
    ...packagingMaterials
      .filter((p) => toNumber(p.currentStock) <= toNumber(p.minStockLevel))
      .map((p) => ({
        type: "PACKAGING" as const,
        id: p.id,
        name: p.name,
        current: toNumber(p.currentStock),
        minimum: toNumber(p.minStockLevel),
        unit: p.unit,
      })),
  ];

  return alerts;
}
