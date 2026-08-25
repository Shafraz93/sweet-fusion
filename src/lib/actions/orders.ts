"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  InventoryItemType,
  StockMovementType,
  UnitOfMeasure,
} from "@/generated/prisma";
import {
  recordInventoryMovement,
  updatePackagingMaterialStock,
  getProductInventoryUnitCost,
} from "@/lib/inventory";
import { toNumber, generateNumber, calcPaymentStatus, normalizeDiscount } from "@/lib/utils";

export async function getSalesOrders() {
  return prisma.salesOrder.findMany({
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { orderNumber: "desc" },
  });
}

export async function getSalesOrder(id: string) {
  return prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
          productLot: true,
          packaging: { include: { packagingMaterial: true } },
        },
      },
    },
  });
}

interface OrderPackagingInput {
  packagingMaterialId: string;
  quantityUsed: number;
  unit: UnitOfMeasure;
}

interface OrderItemInput {
  productId: string;
  quantity: number;
  unit: UnitOfMeasure;
  unitPrice: number;
  packaging?: OrderPackagingInput[];
}

interface ResolvedPackagingRecord {
  packagingMaterialId: string;
  quantityUsed: number;
  unit: UnitOfMeasure;
  unitCost: number;
  totalCost: number;
}

interface ResolvedOrderItem extends OrderItemInput {
  unitCost: number;
  packagingCost: number;
  totalPrice: number;
  totalCost: number;
  packagingRecords: ResolvedPackagingRecord[];
}

async function resolveOrderItemCosts(
  item: OrderItemInput
): Promise<ResolvedOrderItem> {
  const productUnitCost = await getProductInventoryUnitCost(item.productId);

  let totalPackagingCost = 0;
  const packagingRecords: ResolvedPackagingRecord[] = [];

  for (const mat of item.packaging ?? []) {
    if (!mat.packagingMaterialId || mat.quantityUsed <= 0) continue;
    const material = await prisma.packagingMaterial.findUniqueOrThrow({
      where: { id: mat.packagingMaterialId },
    });
    const unitCost = toNumber(material.averageCost);
    const totalCost = mat.quantityUsed * unitCost;
    totalPackagingCost += totalCost;
    packagingRecords.push({
      packagingMaterialId: mat.packagingMaterialId,
      quantityUsed: mat.quantityUsed,
      unit: mat.unit,
      unitCost,
      totalCost,
    });
  }

  const packagingCostPerUnit =
    item.quantity > 0 ? totalPackagingCost / item.quantity : 0;
  const unitCost = productUnitCost + packagingCostPerUnit;

  return {
    ...item,
    unitCost,
    packagingCost: totalPackagingCost,
    totalPrice: item.quantity * item.unitPrice,
    totalCost: item.quantity * unitCost,
    packagingRecords,
  };
}

async function reverseOrderPackaging(
  orderId: string,
  items: Array<{
    packaging: Array<{
      packagingMaterialId: string;
      quantityUsed: Parameters<typeof toNumber>[0];
      unit: UnitOfMeasure;
      unitCost: Parameters<typeof toNumber>[0];
    }>;
  }>
) {
  for (const item of items) {
    for (const pkg of item.packaging) {
      await updatePackagingMaterialStock(
        pkg.packagingMaterialId,
        toNumber(pkg.quantityUsed),
        {
          movementType: StockMovementType.RETURN,
          unit: pkg.unit,
          unitCost: toNumber(pkg.unitCost),
          referenceType: "SalesOrderUpdate",
          referenceId: orderId,
          notes: "Reversed for order edit",
        }
      );
    }
  }
}

async function applyOrderPackaging(
  orderId: string,
  items: ResolvedOrderItem[]
) {
  for (const item of items) {
    for (const pkg of item.packagingRecords) {
      await updatePackagingMaterialStock(
        pkg.packagingMaterialId,
        -pkg.quantityUsed,
        {
          movementType: StockMovementType.PACKAGING_OUT,
          unit: pkg.unit,
          unitCost: pkg.unitCost,
          referenceType: "SalesOrder",
          referenceId: orderId,
        }
      );
    }
  }
}

export async function createSalesOrder(data: {
  customerId: string;
  orderDate: string;
  discount?: number;
  paidAmount?: number;
  notes?: string;
  items: OrderItemInput[];
}) {
  const count = await prisma.salesOrder.count();
  const orderNumber = await generateNumber("ORD", count);

  const itemsWithCosts = await Promise.all(
    data.items.map((item) => resolveOrderItemCosts(item))
  );

  const subtotal = itemsWithCosts.reduce((s, i) => s + i.totalPrice, 0);
  const discount = normalizeDiscount(data.discount ?? 0);
  const totalAmount = subtotal - discount;
  const paidAmount = data.paidAmount ?? 0;

  const order = await prisma.salesOrder.create({
    data: {
      orderNumber,
      customerId: data.customerId,
      orderDate: new Date(data.orderDate),
      subtotal,
      discount,
      totalAmount,
      paidAmount,
      paymentStatus: calcPaymentStatus(totalAmount, paidAmount),
      notes: data.notes,
      items: {
        create: itemsWithCosts.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          packagingCost: item.packagingCost,
          totalPrice: item.totalPrice,
          totalCost: item.totalCost,
          packaging: {
            create: item.packagingRecords.map((pkg) => ({
              packagingMaterialId: pkg.packagingMaterialId,
              quantityUsed: pkg.quantityUsed,
              unit: pkg.unit,
              unitCost: pkg.unitCost,
              totalCost: pkg.totalCost,
            })),
          },
        })),
      },
    },
    include: { items: true },
  });

  for (const item of itemsWithCosts) {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: item.productId },
    });
    const newStock = toNumber(product.currentStock) - item.quantity;

    await prisma.product.update({
      where: { id: item.productId },
      data: { currentStock: newStock },
    });

    await recordInventoryMovement({
      itemType: InventoryItemType.FINISHED_PRODUCT,
      itemId: item.productId,
      itemName: product.name,
      movementType: StockMovementType.SALE,
      quantity: -item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      referenceType: "SalesOrder",
      referenceId: order.id,
    });
  }

  await applyOrderPackaging(order.id, itemsWithCosts);

  revalidatePath("/orders");
  revalidatePath("/packaging");
  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/");
  return order;
}

export async function recordOrderPayment(
  orderId: string,
  amount: number,
  notes?: string
) {
  const order = await prisma.salesOrder.findUniqueOrThrow({
    where: { id: orderId },
  });
  const newPaid = toNumber(order.paidAmount) + amount;
  const total = toNumber(order.totalAmount);

  await prisma.salesOrder.update({
    where: { id: orderId },
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
      customerId: order.customerId,
      amount,
      referenceType: "SalesOrder",
      referenceId: orderId,
      notes,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/payments");
}

export async function updateSalesOrder(
  id: string,
  data: {
    customerId: string;
    orderDate: string;
    discount?: number;
    paidAmount?: number;
    notes?: string;
    items: OrderItemInput[];
  }
) {
  const existing = await prisma.salesOrder.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { packaging: true } },
    },
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
      referenceType: "SalesOrderUpdate",
      referenceId: id,
      notes: "Reversed for order edit",
    });
  }

  await reverseOrderPackaging(id, existing.items);

  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: id } });

  const itemsWithCosts = await Promise.all(
    data.items.map((item) => resolveOrderItemCosts(item))
  );

  const subtotal = itemsWithCosts.reduce((s, i) => s + i.totalPrice, 0);
  const discount = normalizeDiscount(data.discount ?? 0);
  const totalAmount = subtotal - discount;
  const paidAmount = data.paidAmount ?? toNumber(existing.paidAmount);

  const order = await prisma.salesOrder.update({
    where: { id },
    data: {
      customerId: data.customerId,
      orderDate: new Date(data.orderDate),
      subtotal,
      discount,
      totalAmount,
      paidAmount,
      paymentStatus: calcPaymentStatus(totalAmount, paidAmount),
      notes: data.notes,
      items: {
        create: itemsWithCosts.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          packagingCost: item.packagingCost,
          totalPrice: item.totalPrice,
          totalCost: item.totalCost,
          packaging: {
            create: item.packagingRecords.map((pkg) => ({
              packagingMaterialId: pkg.packagingMaterialId,
              quantityUsed: pkg.quantityUsed,
              unit: pkg.unit,
              unitCost: pkg.unitCost,
              totalCost: pkg.totalCost,
            })),
          },
        })),
      },
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
      movementType: StockMovementType.SALE,
      quantity: -item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      referenceType: "SalesOrder",
      referenceId: order.id,
    });
  }

  await applyOrderPackaging(order.id, itemsWithCosts);

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}/edit`);
  revalidatePath("/packaging");
  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/");
  return order;
}

export async function updateSalesOrderFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing order id");
  const items = JSON.parse(data.items) as OrderItemInput[];
  await updateSalesOrder(id, {
    customerId: data.customerId,
    orderDate: data.orderDate,
    discount: normalizeDiscount(data.discount),
    paidAmount: parseFloat(data.paidAmount) || 0,
    notes: data.notes || undefined,
    items,
  });
  redirect("/orders");
}

export async function createSalesOrderFromForm(data: Record<string, string>) {
  const items = JSON.parse(data.items) as OrderItemInput[];
  await createSalesOrder({
    customerId: data.customerId,
    orderDate: data.orderDate,
    discount: normalizeDiscount(data.discount),
    paidAmount: parseFloat(data.paidAmount) || 0,
    notes: data.notes || undefined,
    items,
  });
  redirect("/orders");
}
