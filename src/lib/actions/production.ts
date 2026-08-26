"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  InventoryItemType,
  ProductLotSourceType,
  StockMovementType,
  UnitOfMeasure,
} from "@/generated/prisma";
import {
  recordInventoryMovement,
  updateAverageCost,
  syncProductAverageCostFromLots,
} from "@/lib/inventory";
import { getNextLotNumber } from "@/lib/numbering";
import { toNumber, generateNumber } from "@/lib/utils";

export async function getProductionBatches() {
  return prisma.productionBatch.findMany({
    include: {
      product: true,
      recipe: true,
      ingredients: { include: { rawMaterial: true } },
    },
    orderBy: { productionDate: "desc" },
  });
}

export async function getProductionBatch(id: string) {
  return prisma.productionBatch.findUnique({
    where: { id },
    include: {
      product: true,
      recipe: { include: { ingredients: { include: { rawMaterial: true } } } },
      ingredients: { include: { rawMaterial: true } },
      productLots: true,
      expenses: true,
    },
  });
}

interface IngredientUsage {
  rawMaterialId: string;
  quantityUsed: number;
  unit: UnitOfMeasure;
}

export async function createProductionBatch(data: {
  productId: string;
  recipeId?: string;
  productionDate: string;
  outputQuantity: number;
  outputUnit: UnitOfMeasure;
  labourCost: number;
  otherCost: number;
  notes?: string;
  ingredients: IngredientUsage[];
}) {
  const count = await prisma.productionBatch.count();
  const batchNumber = await generateNumber("BATCH", count);

  let ingredientCost = 0;
  const ingredientRecords: Array<{
    rawMaterialId: string;
    quantityUsed: number;
    unit: UnitOfMeasure;
    unitCost: number;
    totalCost: number;
  }> = [];

  for (const ing of data.ingredients) {
    const material = await prisma.rawMaterial.findUniqueOrThrow({
      where: { id: ing.rawMaterialId },
    });
    const unitCost = toNumber(material.averageCost);
    const totalCost = ing.quantityUsed * unitCost;
    ingredientCost += totalCost;
    ingredientRecords.push({
      rawMaterialId: ing.rawMaterialId,
      quantityUsed: ing.quantityUsed,
      unit: ing.unit,
      unitCost,
      totalCost,
    });
  }

  const totalCost = ingredientCost + data.labourCost + data.otherCost;
  const costPerUnit =
    data.outputQuantity > 0 ? totalCost / data.outputQuantity : 0;

  const batch = await prisma.productionBatch.create({
    data: {
      batchNumber,
      productId: data.productId,
      recipeId: data.recipeId,
      productionDate: new Date(data.productionDate),
      outputQuantity: data.outputQuantity,
      outputUnit: data.outputUnit,
      labourCost: data.labourCost,
      otherCost: data.otherCost,
      ingredientCost,
      totalCost,
      costPerUnit,
      notes: data.notes,
      ingredients: { create: ingredientRecords },
    },
    include: { product: true, ingredients: true },
  });

  for (const ing of ingredientRecords) {
    const material = await prisma.rawMaterial.findUniqueOrThrow({
      where: { id: ing.rawMaterialId },
    });
    const newStock = toNumber(material.currentStock) - ing.quantityUsed;

    await prisma.rawMaterial.update({
      where: { id: ing.rawMaterialId },
      data: { currentStock: newStock },
    });

    await recordInventoryMovement({
      itemType: InventoryItemType.RAW_MATERIAL,
      itemId: ing.rawMaterialId,
      itemName: material.name,
      movementType: StockMovementType.PRODUCTION_OUT,
      quantity: -ing.quantityUsed,
      unit: ing.unit,
      unitCost: ing.unitCost,
      referenceType: "ProductionBatch",
      referenceId: batch.id,
    });
  }

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: data.productId },
  });
  const newAvg = await updateAverageCost(
    toNumber(product.currentStock),
    toNumber(product.averageCost),
    data.outputQuantity,
    costPerUnit
  );

  await prisma.product.update({
    where: { id: data.productId },
    data: {
      currentStock: toNumber(product.currentStock) + data.outputQuantity,
      averageCost: newAvg,
    },
  });

  await prisma.productLot.create({
    data: {
      lotNumber: await getNextLotNumber(),
      productId: data.productId,
      sourceType: ProductLotSourceType.PRODUCTION,
      productionBatchId: batch.id,
      initialQuantity: data.outputQuantity,
      remainingQuantity: data.outputQuantity,
      unit: data.outputUnit,
      productionCost: costPerUnit,
      unitCost: costPerUnit,
    },
  });

  await syncProductAverageCostFromLots(data.productId);

  await recordInventoryMovement({
    itemType: InventoryItemType.FINISHED_PRODUCT,
    itemId: data.productId,
    itemName: product.name,
    movementType: StockMovementType.PRODUCTION_IN,
    quantity: data.outputQuantity,
    unit: data.outputUnit,
    unitCost: costPerUnit,
    referenceType: "ProductionBatch",
    referenceId: batch.id,
  });

  revalidatePath("/production");
  revalidatePath("/inventory");
  revalidatePath("/raw-materials");
  revalidatePath("/products");
  return batch;
}

export async function createPackagingOperation(data: {
  productId: string;
  sourceLotId?: string;
  quantity: number;
  unit: UnitOfMeasure;
  operationDate: string;
  notes?: string;
  materials: {
    packagingMaterialId: string;
    quantityUsed: number;
    unit: UnitOfMeasure;
  }[];
}) {
  const count = await prisma.packagingOperation.count();
  const operationNumber = await generateNumber("PKG", count);

  let totalPackagingCost = 0;
  const materialRecords: Array<{
    packagingMaterialId: string;
    quantityUsed: number;
    unit: UnitOfMeasure;
    unitCost: number;
    totalCost: number;
  }> = [];

  for (const mat of data.materials) {
    const material = await prisma.packagingMaterial.findUniqueOrThrow({
      where: { id: mat.packagingMaterialId },
    });
    const unitCost = toNumber(material.averageCost);
    const totalCost = mat.quantityUsed * unitCost;
    totalPackagingCost += totalCost;
    materialRecords.push({
      packagingMaterialId: mat.packagingMaterialId,
      quantityUsed: mat.quantityUsed,
      unit: mat.unit,
      unitCost,
      totalCost,
    });
  }

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: data.productId },
  });
  const sourceUnitCost = toNumber(product.averageCost);
  const packagingCostPerUnit =
    data.quantity > 0 ? totalPackagingCost / data.quantity : 0;
  const costPerUnit = sourceUnitCost + packagingCostPerUnit;
  const totalCost = costPerUnit * data.quantity;

  const operation = await prisma.packagingOperation.create({
    data: {
      operationNumber,
      productId: data.productId,
      sourceLotId: data.sourceLotId,
      quantity: data.quantity,
      unit: data.unit,
      sourceUnitCost,
      totalPackagingCost,
      totalCost,
      costPerUnit,
      operationDate: new Date(data.operationDate),
      notes: data.notes,
      materials: { create: materialRecords },
    },
  });

  for (const mat of materialRecords) {
    const material = await prisma.packagingMaterial.findUniqueOrThrow({
      where: { id: mat.packagingMaterialId },
    });
    await prisma.packagingMaterial.update({
      where: { id: mat.packagingMaterialId },
      data: {
        currentStock: toNumber(material.currentStock) - mat.quantityUsed,
      },
    });

    await recordInventoryMovement({
      itemType: InventoryItemType.PACKAGING,
      itemId: mat.packagingMaterialId,
      itemName: material.name,
      movementType: StockMovementType.PACKAGING_OUT,
      quantity: -mat.quantityUsed,
      unit: mat.unit,
      unitCost: mat.unitCost,
      referenceType: "PackagingOperation",
      referenceId: operation.id,
    });
  }

  await prisma.productLot.create({
    data: {
      lotNumber: await getNextLotNumber(),
      productId: data.productId,
      sourceType: ProductLotSourceType.PACKAGING,
      packagingOperationId: operation.id,
      initialQuantity: data.quantity,
      remainingQuantity: data.quantity,
      unit: data.unit,
      purchaseCost: sourceUnitCost,
      packagingCost: packagingCostPerUnit,
      unitCost: costPerUnit,
    },
  });

  await recordInventoryMovement({
    itemType: InventoryItemType.FINISHED_PRODUCT,
    itemId: data.productId,
    itemName: product.name,
    movementType: StockMovementType.PACKAGING_IN,
    quantity: data.quantity,
    unit: data.unit,
    unitCost: costPerUnit,
    referenceType: "PackagingOperation",
    referenceId: operation.id,
  });

  revalidatePath("/packaging");
  revalidatePath("/inventory");
  revalidatePath("/products");
  return operation;
}

export async function getPackagingOperations() {
  return prisma.packagingOperation.findMany({
    include: {
      product: true,
      materials: { include: { packagingMaterial: true } },
    },
    orderBy: { operationDate: "desc" },
  });
}

export async function updateProductionBatch(
  id: string,
  data: {
    productionDate?: string;
    labourCost?: number;
    otherCost?: number;
    notes?: string;
  }
) {
  const batch = await prisma.productionBatch.findUniqueOrThrow({ where: { id } });
  const labourCost = data.labourCost ?? toNumber(batch.labourCost);
  const otherCost = data.otherCost ?? toNumber(batch.otherCost);
  const ingredientCost = toNumber(batch.ingredientCost);
  const totalCost = ingredientCost + labourCost + otherCost;
  const costPerUnit =
    toNumber(batch.outputQuantity) > 0
      ? totalCost / toNumber(batch.outputQuantity)
      : 0;

  const updated = await prisma.productionBatch.update({
    where: { id },
    data: {
      productionDate: data.productionDate
        ? new Date(data.productionDate)
        : undefined,
      labourCost,
      otherCost,
      totalCost,
      costPerUnit,
      notes: data.notes,
    },
  });

  revalidatePath("/production");
  revalidatePath(`/production/${id}/edit`);
  return updated;
}

export async function updateProductionBatchFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing production batch id");
  await updateProductionBatch(id, {
    productionDate: data.productionDate,
    labourCost: parseFloat(data.labourCost) || 0,
    otherCost: parseFloat(data.otherCost) || 0,
    notes: data.notes || undefined,
  });
}

export async function createProductionBatchFromForm(data: Record<string, string>) {
  const ingredients = JSON.parse(data.ingredients) as IngredientUsage[];
  await createProductionBatch({
    productId: data.productId,
    recipeId: data.recipeId || undefined,
    productionDate: data.productionDate,
    outputQuantity: parseFloat(data.outputQuantity) || 0,
    outputUnit: data.outputUnit as UnitOfMeasure,
    labourCost: parseFloat(data.labourCost) || 0,
    otherCost: parseFloat(data.otherCost) || 0,
    notes: data.notes || undefined,
    ingredients,
  });
}
