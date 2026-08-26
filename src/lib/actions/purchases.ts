"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  InventoryItemType,
  ProductLotSourceType,
  PurchaseItemType,
  StockMovementType,
  UnitOfMeasure,
} from "@/generated/prisma";
import {
  recordInventoryMovement,
  updateAverageCost,
  syncProductAverageCostFromLots,
  updateRawMaterialStock,
  updatePackagingMaterialStock,
  updateProductStock,
} from "@/lib/inventory";
import { toNumber, generateNumber, calcPaymentStatus } from "@/lib/utils";

export async function getPurchases() {
  return prisma.purchase.findMany({
    include: {
      supplier: true,
      items: {
        include: { product: true, rawMaterial: true, packagingMaterial: true },
      },
    },
    orderBy: { purchaseNumber: "desc" },
  });
}

export async function getPurchase(id: string) {
  return prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: { product: true, rawMaterial: true, packagingMaterial: true, productLots: true },
      },
    },
  });
}

interface PurchaseItemInput {
  itemType: PurchaseItemType;
  productId?: string;
  rawMaterialId?: string;
  packagingMaterialId?: string;
  quantity: number;
  unit: UnitOfMeasure;
  unitCost: number;
}

export async function createPurchase(data: {
  supplierId: string;
  purchaseDate: string;
  invoiceRef?: string;
  paidAmount?: number;
  notes?: string;
  items: PurchaseItemInput[];
}) {
  const count = await prisma.purchase.count();
  const purchaseNumber = await generateNumber("PUR", count);

  const itemsWithTotals = data.items.map((item) => ({
    ...item,
    totalCost: item.quantity * item.unitCost,
  }));
  const totalAmount = itemsWithTotals.reduce((s, i) => s + i.totalCost, 0);
  const paidAmount = data.paidAmount ?? 0;

  const purchase = await prisma.purchase.create({
    data: {
      purchaseNumber,
      supplierId: data.supplierId,
      purchaseDate: new Date(data.purchaseDate),
      invoiceRef: data.invoiceRef,
      totalAmount,
      paidAmount,
      paymentStatus: calcPaymentStatus(totalAmount, paidAmount),
      notes: data.notes,
      items: { create: itemsWithTotals },
    },
    include: { items: true },
  });

  for (const item of purchase.items) {
    if (item.itemType === PurchaseItemType.FINISHED_PRODUCT && item.productId) {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: item.productId },
      });
      const qty = toNumber(item.quantity);
      const unitCost = toNumber(item.unitCost);
      const newAvg = await updateAverageCost(
        toNumber(product.currentStock),
        toNumber(product.averageCost),
        qty,
        unitCost
      );

      await prisma.product.update({
        where: { id: item.productId },
        data: {
          currentStock: toNumber(product.currentStock) + qty,
          averageCost: newAvg,
        },
      });

      const lotCount = await prisma.productLot.count();
      await prisma.productLot.create({
        data: {
          lotNumber: await generateNumber("LOT", lotCount),
          productId: item.productId,
          sourceType: ProductLotSourceType.PURCHASE,
          purchaseItemId: item.id,
          initialQuantity: qty,
          remainingQuantity: qty,
          unit: item.unit,
          purchaseCost: unitCost,
          unitCost,
        },
      });

      await syncProductAverageCostFromLots(item.productId);

      await recordInventoryMovement({
        itemType: InventoryItemType.FINISHED_PRODUCT,
        itemId: item.productId,
        itemName: product.name,
        movementType: StockMovementType.PURCHASE,
        quantity: qty,
        unit: item.unit,
        unitCost,
        referenceType: "Purchase",
        referenceId: purchase.id,
      });
    } else if (
      item.itemType === PurchaseItemType.RAW_MATERIAL &&
      item.rawMaterialId
    ) {
      const material = await prisma.rawMaterial.findUniqueOrThrow({
        where: { id: item.rawMaterialId },
      });
      const qty = toNumber(item.quantity);
      const unitCost = toNumber(item.unitCost);
      const newAvg = await updateAverageCost(
        toNumber(material.currentStock),
        toNumber(material.averageCost),
        qty,
        unitCost
      );

      await prisma.rawMaterial.update({
        where: { id: item.rawMaterialId },
        data: {
          currentStock: toNumber(material.currentStock) + qty,
          averageCost: newAvg,
        },
      });

      await recordInventoryMovement({
        itemType: InventoryItemType.RAW_MATERIAL,
        itemId: item.rawMaterialId,
        itemName: material.name,
        movementType: StockMovementType.PURCHASE,
        quantity: qty,
        unit: item.unit,
        unitCost,
        referenceType: "Purchase",
        referenceId: purchase.id,
      });
    } else if (
      item.itemType === PurchaseItemType.PACKAGING &&
      item.packagingMaterialId
    ) {
      const material = await prisma.packagingMaterial.findUniqueOrThrow({
        where: { id: item.packagingMaterialId },
      });
      const qty = toNumber(item.quantity);
      const unitCost = toNumber(item.unitCost);
      const newAvg = await updateAverageCost(
        toNumber(material.currentStock),
        toNumber(material.averageCost),
        qty,
        unitCost
      );

      await prisma.packagingMaterial.update({
        where: { id: item.packagingMaterialId },
        data: {
          currentStock: toNumber(material.currentStock) + qty,
          averageCost: newAvg,
        },
      });

      await recordInventoryMovement({
        itemType: InventoryItemType.PACKAGING,
        itemId: item.packagingMaterialId,
        itemName: material.name,
        movementType: StockMovementType.PURCHASE,
        quantity: qty,
        unit: item.unit,
        unitCost,
        referenceType: "Purchase",
        referenceId: purchase.id,
      });
    }
  }

  revalidatePath("/purchases");
  return purchase;
}

export async function recordPurchasePayment(
  purchaseId: string,
  amount: number,
  notes?: string
) {
  const purchase = await prisma.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
  });
  const newPaid = toNumber(purchase.paidAmount) + amount;
  const total = toNumber(purchase.totalAmount);

  await prisma.purchase.update({
    where: { id: purchaseId },
    data: {
      paidAmount: newPaid,
      paymentStatus: calcPaymentStatus(total, newPaid),
    },
  });

  const payCount = await prisma.payment.count();
  await prisma.payment.create({
    data: {
      paymentNumber: await generateNumber("PAY", payCount),
      entityType: "SUPPLIER",
      supplierId: purchase.supplierId,
      amount,
      referenceType: "Purchase",
      referenceId: purchaseId,
      notes,
    },
  });

  revalidatePath("/purchases");
  revalidatePath("/payments");
}

export async function updatePurchase(
  id: string,
  data: {
    supplierId: string;
    purchaseDate: string;
    invoiceRef?: string;
    paidAmount?: number;
    notes?: string;
    items: PurchaseItemInput[];
  }
) {
  const existing = await prisma.purchase.findUniqueOrThrow({
    where: { id },
    include: { items: { include: { productLots: true } } },
  });

  for (const item of existing.items) {
    const qty = toNumber(item.quantity);
    if (item.itemType === PurchaseItemType.FINISHED_PRODUCT && item.productId) {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: item.productId },
      });
      await prisma.product.update({
        where: { id: item.productId },
        data: { currentStock: Math.max(0, toNumber(product.currentStock) - qty) },
      });
      await prisma.productLot.deleteMany({ where: { purchaseItemId: item.id } });
      await recordInventoryMovement({
        itemType: InventoryItemType.FINISHED_PRODUCT,
        itemId: item.productId,
        itemName: product.name,
        movementType: StockMovementType.ADJUSTMENT,
        quantity: -qty,
        unit: item.unit,
        unitCost: toNumber(item.unitCost),
        referenceType: "PurchaseUpdate",
        referenceId: id,
        notes: "Reversed for purchase edit",
      });
    } else if (item.itemType === PurchaseItemType.RAW_MATERIAL && item.rawMaterialId) {
      const material = await prisma.rawMaterial.findUniqueOrThrow({
        where: { id: item.rawMaterialId },
      });
      await prisma.rawMaterial.update({
        where: { id: item.rawMaterialId },
        data: { currentStock: Math.max(0, toNumber(material.currentStock) - qty) },
      });
      await recordInventoryMovement({
        itemType: InventoryItemType.RAW_MATERIAL,
        itemId: item.rawMaterialId,
        itemName: material.name,
        movementType: StockMovementType.ADJUSTMENT,
        quantity: -qty,
        unit: item.unit,
        unitCost: toNumber(item.unitCost),
        referenceType: "PurchaseUpdate",
        referenceId: id,
        notes: "Reversed for purchase edit",
      });
    } else if (item.itemType === PurchaseItemType.PACKAGING && item.packagingMaterialId) {
      const material = await prisma.packagingMaterial.findUniqueOrThrow({
        where: { id: item.packagingMaterialId },
      });
      await prisma.packagingMaterial.update({
        where: { id: item.packagingMaterialId },
        data: { currentStock: Math.max(0, toNumber(material.currentStock) - qty) },
      });
      await recordInventoryMovement({
        itemType: InventoryItemType.PACKAGING,
        itemId: item.packagingMaterialId,
        itemName: material.name,
        movementType: StockMovementType.ADJUSTMENT,
        quantity: -qty,
        unit: item.unit,
        unitCost: toNumber(item.unitCost),
        referenceType: "PurchaseUpdate",
        referenceId: id,
        notes: "Reversed for purchase edit",
      });
    }
  }

  await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });

  const itemsWithTotals = data.items.map((item) => ({
    ...item,
    totalCost: item.quantity * item.unitCost,
  }));
  const totalAmount = itemsWithTotals.reduce((s, i) => s + i.totalCost, 0);
  const paidAmount = data.paidAmount ?? toNumber(existing.paidAmount);

  const purchase = await prisma.purchase.update({
    where: { id },
    data: {
      supplierId: data.supplierId,
      purchaseDate: new Date(data.purchaseDate),
      invoiceRef: data.invoiceRef,
      totalAmount,
      paidAmount,
      paymentStatus: calcPaymentStatus(totalAmount, paidAmount),
      notes: data.notes,
      items: { create: itemsWithTotals },
    },
    include: { items: true },
  });

  for (const item of purchase.items) {
    if (item.itemType === PurchaseItemType.FINISHED_PRODUCT && item.productId) {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: item.productId },
      });
      const qty = toNumber(item.quantity);
      const unitCost = toNumber(item.unitCost);
      const newAvg = await updateAverageCost(
        toNumber(product.currentStock),
        toNumber(product.averageCost),
        qty,
        unitCost
      );
      await prisma.product.update({
        where: { id: item.productId },
        data: { currentStock: toNumber(product.currentStock) + qty, averageCost: newAvg },
      });
      const lotCount = await prisma.productLot.count();
      await prisma.productLot.create({
        data: {
          lotNumber: await generateNumber("LOT", lotCount),
          productId: item.productId,
          sourceType: ProductLotSourceType.PURCHASE,
          purchaseItemId: item.id,
          initialQuantity: qty,
          remainingQuantity: qty,
          unit: item.unit,
          purchaseCost: unitCost,
          unitCost,
        },
      });
      await syncProductAverageCostFromLots(item.productId);
      await recordInventoryMovement({
        itemType: InventoryItemType.FINISHED_PRODUCT,
        itemId: item.productId,
        itemName: product.name,
        movementType: StockMovementType.PURCHASE,
        quantity: qty,
        unit: item.unit,
        unitCost,
        referenceType: "Purchase",
        referenceId: purchase.id,
      });
    } else if (item.itemType === PurchaseItemType.RAW_MATERIAL && item.rawMaterialId) {
      const material = await prisma.rawMaterial.findUniqueOrThrow({
        where: { id: item.rawMaterialId },
      });
      const qty = toNumber(item.quantity);
      const unitCost = toNumber(item.unitCost);
      const newAvg = await updateAverageCost(
        toNumber(material.currentStock),
        toNumber(material.averageCost),
        qty,
        unitCost
      );
      await prisma.rawMaterial.update({
        where: { id: item.rawMaterialId },
        data: { currentStock: toNumber(material.currentStock) + qty, averageCost: newAvg },
      });
      await recordInventoryMovement({
        itemType: InventoryItemType.RAW_MATERIAL,
        itemId: item.rawMaterialId,
        itemName: material.name,
        movementType: StockMovementType.PURCHASE,
        quantity: qty,
        unit: item.unit,
        unitCost,
        referenceType: "Purchase",
        referenceId: purchase.id,
      });
    } else if (item.itemType === PurchaseItemType.PACKAGING && item.packagingMaterialId) {
      const material = await prisma.packagingMaterial.findUniqueOrThrow({
        where: { id: item.packagingMaterialId },
      });
      const qty = toNumber(item.quantity);
      const unitCost = toNumber(item.unitCost);
      const newAvg = await updateAverageCost(
        toNumber(material.currentStock),
        toNumber(material.averageCost),
        qty,
        unitCost
      );
      await prisma.packagingMaterial.update({
        where: { id: item.packagingMaterialId },
        data: { currentStock: toNumber(material.currentStock) + qty, averageCost: newAvg },
      });
      await recordInventoryMovement({
        itemType: InventoryItemType.PACKAGING,
        itemId: item.packagingMaterialId,
        itemName: material.name,
        movementType: StockMovementType.PURCHASE,
        quantity: qty,
        unit: item.unit,
        unitCost,
        referenceType: "Purchase",
        referenceId: purchase.id,
      });
    }
  }

  revalidatePath("/purchases");
  return purchase;
}

export async function updatePurchaseFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing purchase id");
  const items = JSON.parse(data.items) as PurchaseItemInput[];
  await updatePurchase(id, {
    supplierId: data.supplierId,
    purchaseDate: data.purchaseDate,
    invoiceRef: data.invoiceRef || undefined,
    paidAmount: Math.round(parseFloat(data.paidAmount) || 0),
    notes: data.notes || undefined,
    items,
  });
}

export async function createPurchaseFromForm(data: Record<string, string>) {
  const items = JSON.parse(data.items) as PurchaseItemInput[];
  await createPurchase({
    supplierId: data.supplierId,
    purchaseDate: data.purchaseDate,
    invoiceRef: data.invoiceRef || undefined,
    paidAmount: Math.round(parseFloat(data.paidAmount) || 0),
    notes: data.notes || undefined,
    items,
  });
}
