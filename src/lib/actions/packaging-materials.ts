"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UnitOfMeasure } from "@/generated/prisma";
import {
  InventoryItemType,
  StockMovementType,
} from "@/generated/prisma";
import { recordInventoryMovement } from "@/lib/inventory";
import { toNumber } from "@/lib/utils";

export async function getPackagingMaterials(search?: string) {
  return prisma.packagingMaterial.findMany({
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    orderBy: { name: "asc" },
  });
}

export async function getPackagingMaterial(id: string) {
  const material = await prisma.packagingMaterial.findUnique({
    where: { id },
    include: {
      purchaseItems: {
        include: { purchase: { include: { supplier: true } } },
        take: 10,
      },
      packagingOpMaterials: {
        include: {
          packagingOperation: { include: { product: true } },
        },
        take: 10,
      },
    },
  });

  const movements = material
    ? await prisma.inventoryMovement.findMany({
        where: {
          itemType: InventoryItemType.PACKAGING,
          itemId: id,
        },
        orderBy: { movementDate: "desc" },
        take: 30,
      })
    : [];

  return material ? { ...material, movements } : null;
}

export async function createPackagingMaterial(data: {
  name: string;
  unit: UnitOfMeasure;
  minStockLevel: number;
  description?: string;
}) {
  const material = await prisma.packagingMaterial.create({ data });
  revalidatePath("/packaging");
  return material;
}

export async function updatePackagingMaterial(
  id: string,
  data: Partial<{
    name: string;
    unit: UnitOfMeasure;
    minStockLevel: number;
    description: string;
  }>
) {
  const material = await prisma.packagingMaterial.update({ where: { id }, data });
  revalidatePath("/packaging");
  return material;
}

export async function adjustPackagingStock(
  id: string,
  quantity: number,
  notes: string
) {
  const material = await prisma.packagingMaterial.findUniqueOrThrow({
    where: { id },
  });
  const newStock = toNumber(material.currentStock) + quantity;

  await prisma.packagingMaterial.update({
    where: { id },
    data: { currentStock: newStock },
  });

  await recordInventoryMovement({
    itemType: InventoryItemType.PACKAGING,
    itemId: id,
    itemName: material.name,
    movementType: StockMovementType.ADJUSTMENT,
    quantity,
    unit: material.unit,
    unitCost: toNumber(material.averageCost),
    notes,
  });

  revalidatePath("/packaging");
  revalidatePath("/inventory");
}

export async function updatePackagingMaterialFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing packaging material id");
  await updatePackagingMaterial(id, {
    name: data.name,
    unit: data.unit as UnitOfMeasure,
    minStockLevel: parseFloat(data.minStockLevel) || 0,
    description: data.description || undefined,
  });
}

export async function createPackagingMaterialFromForm(data: Record<string, string>) {
  await createPackagingMaterial({
    name: data.name,
    unit: data.unit as UnitOfMeasure,
    minStockLevel: parseFloat(data.minStockLevel) || 0,
    description: data.description || undefined,
  });
}
