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

export async function getRawMaterials(search?: string) {
  return prisma.rawMaterial.findMany({
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    orderBy: { name: "asc" },
  });
}

export async function getRawMaterial(id: string) {
  const material = await prisma.rawMaterial.findUnique({
    where: { id },
    include: {
      purchaseItems: {
        include: { purchase: { include: { supplier: true } } },
        orderBy: { purchase: { purchaseDate: "desc" } },
        take: 10,
      },
      productionBatchIngredients: {
        include: { productionBatch: { include: { product: true } } },
        orderBy: { productionBatch: { productionDate: "desc" } },
        take: 10,
      },
    },
  });

  const movements = material
    ? await prisma.inventoryMovement.findMany({
        where: {
          itemType: InventoryItemType.RAW_MATERIAL,
          itemId: id,
        },
        orderBy: { movementDate: "desc" },
        take: 30,
      })
    : [];

  return material ? { ...material, movements } : null;
}

export async function createRawMaterial(data: {
  name: string;
  category?: string;
  unit: UnitOfMeasure;
  minStockLevel: number;
  description?: string;
}) {
  const material = await prisma.rawMaterial.create({ data });
  revalidatePath("/raw-materials");
  return material;
}

export async function updateRawMaterial(
  id: string,
  data: Partial<{
    name: string;
    category: string;
    unit: UnitOfMeasure;
    minStockLevel: number;
    description: string;
  }>
) {
  const material = await prisma.rawMaterial.update({ where: { id }, data });
  revalidatePath("/raw-materials");
  return material;
}

export async function adjustRawMaterialStock(
  id: string,
  quantity: number,
  notes: string,
  type: "ADJUSTMENT" | "DAMAGE" = "ADJUSTMENT"
) {
  const material = await prisma.rawMaterial.findUniqueOrThrow({
    where: { id },
  });
  const newStock = toNumber(material.currentStock) + quantity;

  await prisma.rawMaterial.update({
    where: { id },
    data: { currentStock: newStock },
  });

  await recordInventoryMovement({
    itemType: InventoryItemType.RAW_MATERIAL,
    itemId: id,
    itemName: material.name,
    movementType: type as StockMovementType,
    quantity,
    unit: material.unit,
    unitCost: toNumber(material.averageCost),
    notes,
  });

  revalidatePath("/raw-materials");
  revalidatePath("/inventory");
}

export async function updateRawMaterialFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing raw material id");
  await updateRawMaterial(id, {
    name: data.name,
    category: data.category || undefined,
    unit: data.unit as UnitOfMeasure,
    minStockLevel: parseFloat(data.minStockLevel) || 0,
    description: data.description || undefined,
  });
}

export async function createRawMaterialFromForm(data: Record<string, string>) {
  await createRawMaterial({
    name: data.name,
    category: data.category || undefined,
    unit: data.unit as UnitOfMeasure,
    minStockLevel: parseFloat(data.minStockLevel) || 0,
    description: data.description || undefined,
  });
}
