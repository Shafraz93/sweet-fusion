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
import { toNumber, generateNumber, calcPaymentStatus } from "@/lib/utils";

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

export async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      recipes: { include: { ingredients: { include: { rawMaterial: true } } } },
      productLots: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          purchaseItem: { include: { purchase: { include: { supplier: true } } } },
          productionBatch: true,
          packagingOperation: true,
        },
      },
      productionBatches: {
        orderBy: { productionDate: "desc" },
        take: 10,
        include: { ingredients: { include: { rawMaterial: true } } },
      },
    },
  });
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

export async function getProductTraceability(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      category: true,
      productLots: {
        include: {
          purchaseItem: {
            include: {
              purchase: { include: { supplier: true } },
            },
          },
          productionBatch: {
            include: {
              ingredients: { include: { rawMaterial: true } },
              recipe: true,
            },
          },
          packagingOperation: {
            include: {
              materials: { include: { packagingMaterial: true } },
              sourceLot: true,
            },
          },
          salesOrderItems: { include: { salesOrder: { include: { customer: true } } } },
          wholesaleItems: { include: { wholesaleSupply: { include: { customer: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      purchaseItems: {
        include: {
          purchase: { include: { supplier: true } },
        },
      },
      productionBatches: {
        include: {
          ingredients: { include: { rawMaterial: true } },
          recipe: true,
        },
      },
      packagingOps: {
        include: {
          materials: { include: { packagingMaterial: true } },
        },
      },
    },
  });

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      itemType: InventoryItemType.FINISHED_PRODUCT,
      itemId: productId,
    },
    orderBy: { movementDate: "desc" },
    take: 50,
  });

  return { product, movements };
}
