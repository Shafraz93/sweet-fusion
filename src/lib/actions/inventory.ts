"use server";

import { prisma } from "@/lib/prisma";
import { InventoryItemType } from "@/generated/prisma";
import { toNumber } from "@/lib/utils";
import { getLowStockAlerts } from "@/lib/inventory";

export async function getInventoryOverview() {
  const [products, rawMaterials, packagingMaterials, recentMovements] =
    await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { name: "asc" },
      }),
      prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
      prisma.packagingMaterial.findMany({ orderBy: { name: "asc" } }),
      prisma.inventoryMovement.findMany({
        orderBy: { movementDate: "desc" },
        take: 50,
      }),
    ]);

  const lowStock = await getLowStockAlerts();

  const finishedValue = products.reduce(
    (s, p) => s + toNumber(p.currentStock) * toNumber(p.averageCost),
    0
  );
  const rawValue = rawMaterials.reduce(
    (s, r) => s + toNumber(r.currentStock) * toNumber(r.averageCost),
    0
  );
  const packagingValue = packagingMaterials.reduce(
    (s, p) => s + toNumber(p.currentStock) * toNumber(p.averageCost),
    0
  );

  return {
    products,
    rawMaterials,
    packagingMaterials,
    recentMovements,
    lowStock,
    totalValue: finishedValue + rawValue + packagingValue,
  };
}

export async function getStockMovements(
  itemType?: InventoryItemType,
  itemId?: string
) {
  return prisma.inventoryMovement.findMany({
    where: {
      ...(itemType ? { itemType } : {}),
      ...(itemId ? { itemId } : {}),
    },
    orderBy: { movementDate: "desc" },
    take: 100,
  });
}

export async function getProductLots(productId?: string) {
  return prisma.productLot.findMany({
    where: productId ? { productId } : undefined,
    include: {
      product: true,
      purchaseItem: { include: { purchase: { include: { supplier: true } } } },
      productionBatch: true,
      packagingOperation: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
