"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  InventoryItemType,
  ProductType,
  StockMovementType,
  UnitOfMeasure,
} from "@/generated/prisma";
import {
  recordInventoryMovement,
  updateAverageCost,
} from "@/lib/inventory";
import { toNumber, generateNumber, calcPaymentStatus, lineRevenueAfterDiscount } from "@/lib/utils";

export async function getProducts(search?: string) {
  return prisma.product.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

/** All-time sales totals grouped by product (revenue after order discounts). */
export async function getProductSalesTotals() {
  const items = await prisma.salesOrderItem.findMany({
    select: {
      productId: true,
      quantity: true,
      totalPrice: true,
      totalCost: true,
      salesOrder: { select: { subtotal: true, discount: true } },
    },
  });

  const byProduct = new Map<
    string,
    { quantity: number; revenue: number; cost: number; profit: number }
  >();

  for (const item of items) {
    const revenue = lineRevenueAfterDiscount(
      item.totalPrice,
      item.salesOrder.subtotal,
      item.salesOrder.discount
    );
    const cost = toNumber(item.totalCost);
    const existing = byProduct.get(item.productId) ?? {
      quantity: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    };
    byProduct.set(item.productId, {
      quantity: existing.quantity + toNumber(item.quantity),
      revenue: existing.revenue + revenue,
      cost: existing.cost + cost,
      profit: existing.revenue + revenue - (existing.cost + cost),
    });
  }

  return byProduct;
}

/** All-time sales summary across all orders. */
export async function getSalesSummary() {
  const [orderAgg, itemAgg] = await Promise.all([
    prisma.salesOrder.aggregate({
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.salesOrderItem.aggregate({
      _sum: { quantity: true, totalPrice: true, totalCost: true },
    }),
  ]);

  const totalRevenue = toNumber(orderAgg._sum.totalAmount);
  const soldCost = toNumber(itemAgg._sum.totalCost);

  return {
    orderCount: orderAgg._count,
    totalRevenue,
    itemsSold: toNumber(itemAgg._sum.quantity),
    lineRevenue: toNumber(itemAgg._sum.totalPrice),
    totalCost: soldCost,
    totalProfit: totalRevenue - soldCost,
  };
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      recipes: { include: { ingredients: { include: { rawMaterial: true } } } },
    },
  });
}

export async function getProductHistory(productId: string) {
  const [purchases, production, sales] = await Promise.all([
    prisma.purchaseItem.findMany({
      where: { productId, itemType: "FINISHED_PRODUCT" },
      include: {
        purchase: { include: { supplier: true } },
      },
      orderBy: { purchase: { purchaseDate: "desc" } },
    }),
    prisma.productionBatch.findMany({
      where: { productId },
      orderBy: { productionDate: "desc" },
    }),
    prisma.salesOrderItem.findMany({
      where: { productId },
      include: {
        salesOrder: { include: { customer: true } },
      },
      orderBy: { salesOrder: { orderDate: "desc" } },
    }),
  ]);

  const buyingTotalQty = purchases.reduce((s, p) => s + toNumber(p.quantity), 0)
    + production.reduce((s, b) => s + toNumber(b.outputQuantity), 0);
  const buyingTotalCost = purchases.reduce((s, p) => s + toNumber(p.totalCost), 0)
    + production.reduce((s, b) => s + toNumber(b.totalCost), 0);

  const soldQty = sales.reduce((s, item) => s + toNumber(item.quantity), 0);
  const soldRevenue = sales.reduce(
    (s, item) =>
      s +
      lineRevenueAfterDiscount(
        item.totalPrice,
        item.salesOrder.subtotal,
        item.salesOrder.discount
      ),
    0
  );
  const soldCost = sales.reduce((s, item) => s + toNumber(item.totalCost), 0);
  const soldProfit = soldRevenue - soldCost;

  return {
    purchases,
    production,
    sales,
    buyingTotalQty,
    buyingTotalCost,
    soldQty,
    soldRevenue,
    soldCost,
    soldProfit,
  };
}

export async function getCategories() {
  return prisma.productCategory.findMany({ orderBy: { name: "asc" } });
}

export async function createProduct(data: {
  name: string;
  sku: string;
  categoryId: string;
  type: ProductType;
  unit: UnitOfMeasure;
  sellingPrice: number;
  wholesalePrice: number;
  minStockLevel: number;
  description?: string;
  imageUrl?: string;
}) {
  const product = await prisma.product.create({ data });
  revalidatePath("/products");
  return product;
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    sku: string;
    categoryId: string;
    type: ProductType;
    unit: UnitOfMeasure;
    sellingPrice: number;
    wholesalePrice: number;
    minStockLevel: number;
    description: string;
    imageUrl: string;
    isActive: boolean;
  }>
) {
  const product = await prisma.product.update({ where: { id }, data });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return product;
}

export async function updateCategory(
  id: string,
  data: { name?: string; description?: string }
) {
  const category = await prisma.productCategory.update({ where: { id }, data });
  revalidatePath("/products");
  revalidatePath("/products/categories");
  return category;
}

export async function updateCategoryFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing category id");
  await updateCategory(id, {
    name: data.name,
    description: data.description || undefined,
  });
}

export async function createCategory(name: string, description?: string) {
  const category = await prisma.productCategory.create({
    data: { name, description },
  });
  revalidatePath("/products");
  revalidatePath("/products/categories");
  return category;
}

export async function adjustProductStock(
  productId: string,
  quantity: number,
  notes: string,
  movementType: "ADJUSTMENT" | "DAMAGE" | "RETURN" = "ADJUSTMENT"
) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });
  const newStock = toNumber(product.currentStock) + quantity;

  await prisma.product.update({
    where: { id: productId },
    data: { currentStock: newStock },
  });

  await recordInventoryMovement({
    itemType: InventoryItemType.FINISHED_PRODUCT,
    itemId: productId,
    itemName: product.name,
    movementType: movementType as StockMovementType,
    quantity,
    unit: product.unit,
    unitCost: toNumber(product.averageCost),
    notes,
  });

  revalidatePath("/inventory");
  revalidatePath("/products");
}

export async function updateProductFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing product id");
  await updateProduct(id, {
    name: data.name,
    sku: data.sku,
    categoryId: data.categoryId,
    type: data.type as ProductType,
    unit: data.unit as UnitOfMeasure,
    sellingPrice: parseFloat(data.sellingPrice) || 0,
    wholesalePrice: parseFloat(data.wholesalePrice) || 0,
    minStockLevel: parseFloat(data.minStockLevel) || 0,
    description: data.description || undefined,
    isActive: data.isActive !== "false",
  });
}

export async function createProductFromForm(data: Record<string, string>) {
  await createProduct({
    name: data.name,
    sku: data.sku,
    categoryId: data.categoryId,
    type: data.type as ProductType,
    unit: data.unit as UnitOfMeasure,
    sellingPrice: parseFloat(data.sellingPrice) || 0,
    wholesalePrice: parseFloat(data.wholesalePrice) || 0,
    minStockLevel: parseFloat(data.minStockLevel) || 0,
    description: data.description || undefined,
  });
}

export async function createCategoryFromForm(data: Record<string, string>) {
  await createCategory(data.name, data.description || undefined);
}
