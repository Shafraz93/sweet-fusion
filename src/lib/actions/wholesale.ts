"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  InventoryItemType,
  StockMovementType,
  UnitOfMeasure,
} from "@/generated/prisma";
import { recordInventoryMovement } from "@/lib/inventory";
import { toNumber, generateNumber, calcPaymentStatus } from "@/lib/utils";

export async function getWholesaleSupplies() {
  return prisma.wholesaleSupply.findMany({
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { supplyDate: "desc" },
  });
}

export async function getWholesaleSupply(id: string) {
  return prisma.wholesaleSupply.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true, productLot: true } },
    },
  });
}

interface SupplyItemInput {
  productId: string;
  quantity: number;
  unit: UnitOfMeasure;
  unitPrice: number;
}

export async function createWholesaleSupply(data: {
  customerId: string;
  supplyDate: string;
  dueDate?: string;
  paidAmount?: number;
  notes?: string;
  items: SupplyItemInput[];
}) {
  const count = await prisma.wholesaleSupply.count();
  const supplyNumber = await generateNumber("WS", count);

  const itemsWithCosts = await Promise.all(
    data.items.map(async (item) => {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: item.productId },
      });
      const unitCost = toNumber(product.averageCost);
      return {
        ...item,
        unitCost,
        totalPrice: item.quantity * item.unitPrice,
        totalCost: item.quantity * unitCost,
      };
    })
  );

  const subtotal = itemsWithCosts.reduce((s, i) => s + i.totalPrice, 0);
  const totalAmount = subtotal;
  const paidAmount = data.paidAmount ?? 0;

  const supply = await prisma.wholesaleSupply.create({
    data: {
      supplyNumber,
      customerId: data.customerId,
      supplyDate: new Date(data.supplyDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      subtotal,
      totalAmount,
      paidAmount,
      paymentStatus: calcPaymentStatus(totalAmount, paidAmount),
      notes: data.notes,
      items: { create: itemsWithCosts },
    },
    include: { items: true },
  });

  for (const item of itemsWithCosts) {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: item.productId },
    });
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        currentStock: toNumber(product.currentStock) - item.quantity,
      },
    });

    await recordInventoryMovement({
      itemType: InventoryItemType.FINISHED_PRODUCT,
      itemId: item.productId,
      itemName: product.name,
      movementType: StockMovementType.WHOLESALE,
      quantity: -item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      referenceType: "WholesaleSupply",
      referenceId: supply.id,
    });
  }

  revalidatePath("/wholesale");
  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/");
  return supply;
}

export async function recordWholesalePayment(
  supplyId: string,
  amount: number,
  notes?: string
) {
  const supply = await prisma.wholesaleSupply.findUniqueOrThrow({
    where: { id: supplyId },
  });
  const newPaid = toNumber(supply.paidAmount) + amount;
  const total = toNumber(supply.totalAmount);

  await prisma.wholesaleSupply.update({
    where: { id: supplyId },
    data: {
      paidAmount: newPaid,
      paymentStatus: calcPaymentStatus(total, newPaid),
    },
  });

  const payCount = await prisma.payment.count();
  await prisma.payment.create({
    data: {
      paymentNumber: await generateNumber("PAY", payCount),
      entityType: "CUSTOMER",
      customerId: supply.customerId,
      amount,
      referenceType: "WholesaleSupply",
      referenceId: supplyId,
      notes,
    },
  });

  revalidatePath("/wholesale");
  revalidatePath("/payments");
}

export async function updateWholesaleSupply(
  id: string,
  data: {
    customerId: string;
    supplyDate: string;
    dueDate?: string;
    paidAmount?: number;
    notes?: string;
    items: SupplyItemInput[];
  }
) {
  const existing = await prisma.wholesaleSupply.findUniqueOrThrow({
    where: { id },
    include: { items: true },
  });

  for (const item of existing.items) {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: item.productId },
    });
    const qty = toNumber(item.quantity);
    await prisma.product.update({
      where: { id: item.productId },
      data: { currentStock: toNumber(product.currentStock) + qty },
    });
    await recordInventoryMovement({
      itemType: InventoryItemType.FINISHED_PRODUCT,
      itemId: item.productId,
      itemName: product.name,
      movementType: StockMovementType.RETURN,
      quantity: qty,
      unit: item.unit,
      unitCost: toNumber(item.unitCost),
      referenceType: "WholesaleUpdate",
      referenceId: id,
      notes: "Reversed for wholesale edit",
    });
  }

  await prisma.wholesaleSupplyItem.deleteMany({ where: { wholesaleSupplyId: id } });

  const itemsWithCosts = await Promise.all(
    data.items.map(async (item) => {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: item.productId },
      });
      const unitCost = toNumber(product.averageCost);
      return {
        ...item,
        unitCost,
        totalPrice: item.quantity * item.unitPrice,
        totalCost: item.quantity * unitCost,
      };
    })
  );

  const subtotal = itemsWithCosts.reduce((s, i) => s + i.totalPrice, 0);
  const totalAmount = subtotal;
  const paidAmount = data.paidAmount ?? toNumber(existing.paidAmount);

  const supply = await prisma.wholesaleSupply.update({
    where: { id },
    data: {
      customerId: data.customerId,
      supplyDate: new Date(data.supplyDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      subtotal,
      totalAmount,
      paidAmount,
      paymentStatus: calcPaymentStatus(totalAmount, paidAmount),
      notes: data.notes,
      items: { create: itemsWithCosts },
    },
    include: { items: true },
  });

  for (const item of itemsWithCosts) {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: item.productId },
    });
    await prisma.product.update({
      where: { id: item.productId },
      data: { currentStock: toNumber(product.currentStock) - item.quantity },
    });
    await recordInventoryMovement({
      itemType: InventoryItemType.FINISHED_PRODUCT,
      itemId: item.productId,
      itemName: product.name,
      movementType: StockMovementType.WHOLESALE,
      quantity: -item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      referenceType: "WholesaleSupply",
      referenceId: supply.id,
    });
  }

  revalidatePath("/wholesale");
  revalidatePath(`/wholesale/${id}/edit`);
  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/");
  return supply;
}

export async function updateWholesaleSupplyFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing wholesale supply id");
  const items = JSON.parse(data.items) as SupplyItemInput[];
  await updateWholesaleSupply(id, {
    customerId: data.customerId,
    supplyDate: data.supplyDate,
    dueDate: data.dueDate || undefined,
    paidAmount: parseFloat(data.paidAmount) || 0,
    notes: data.notes || undefined,
    items,
  });
}

export async function createWholesaleSupplyFromForm(data: Record<string, string>) {
  const items = JSON.parse(data.items) as SupplyItemInput[];
  await createWholesaleSupply({
    customerId: data.customerId,
    supplyDate: data.supplyDate,
    dueDate: data.dueDate || undefined,
    paidAmount: parseFloat(data.paidAmount) || 0,
    notes: data.notes || undefined,
    items,
  });
}
