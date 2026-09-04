import { toNumber } from "@/lib/utils";
import { getOrderDisplayTotal, getOrderTotalCost } from "@/lib/order-cost";

/**
 * Plain-JSON shapes for the mobile client. Prisma Decimal values are converted
 * to numbers here so the app never has to parse database-specific types.
 */

type DecimalLike = Parameters<typeof toNumber>[0];

export interface OrderListItemDTO {
  id: string;
  orderNumber: string;
  orderDate: string;
  customerId: string;
  customerName: string;
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
  cost: number;
  profit: number;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  orderDate: Date;
  customerId: string;
  customer: { name: string };
  subtotal: DecimalLike;
  discount: DecimalLike;
  totalAmount: DecimalLike;
  paidAmount: DecimalLike;
  paymentStatus: string;
  notes?: string | null;
  items: Array<{
    quantity: DecimalLike;
    unitCost: DecimalLike;
    totalCost: DecimalLike;
    totalPrice: DecimalLike;
    packagingCost: DecimalLike;
  }>;
}

export function toOrderListItem(order: OrderRecord): OrderListItemDTO {
  const total = getOrderDisplayTotal(order);
  const cost = getOrderTotalCost(order.items);
  const paidAmount = toNumber(order.paidAmount);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate.toISOString(),
    customerId: order.customerId,
    customerName: order.customer.name,
    itemCount: order.items.length,
    subtotal: toNumber(order.subtotal),
    discount: toNumber(order.discount),
    total,
    paidAmount,
    balance: total - paidAmount,
    paymentStatus: order.paymentStatus,
    cost,
    profit: total - cost,
  };
}

export interface OrderDetailDTO extends OrderListItemDTO {
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    cost: number;
  }>;
}

interface OrderDetailRecord extends OrderRecord {
  items: Array<{
    id: string;
    productId: string;
    product: { name: string };
    quantity: DecimalLike;
    unit: string;
    unitPrice: DecimalLike;
    unitCost: DecimalLike;
    totalPrice: DecimalLike;
    totalCost: DecimalLike;
    packagingCost: DecimalLike;
  }>;
}

export function toOrderDetail(order: OrderDetailRecord): OrderDetailDTO {
  return {
    ...toOrderListItem(order),
    notes: order.notes ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: toNumber(item.quantity),
      unit: item.unit,
      unitPrice: toNumber(item.unitPrice),
      totalPrice: toNumber(item.totalPrice),
      cost: toNumber(item.totalCost),
    })),
  };
}

export interface ProductDTO {
  id: string;
  name: string;
  sku: string;
  unit: string;
  sellingPrice: number;
  wholesalePrice: number;
  currentStock: number;
  categoryName: string | null;
}

export function toProduct(product: {
  id: string;
  name: string;
  sku: string;
  unit: string;
  sellingPrice: DecimalLike;
  wholesalePrice: DecimalLike;
  currentStock: DecimalLike;
  category?: { name: string } | null;
}): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    sellingPrice: toNumber(product.sellingPrice),
    wholesalePrice: toNumber(product.wholesalePrice),
    currentStock: toNumber(product.currentStock),
    categoryName: product.category?.name ?? null,
  };
}

export interface CustomerDTO {
  id: string;
  name: string;
  phone: string | null;
  type: string;
  orderCount: number;
}

export function toCustomer(customer: {
  id: string;
  name: string;
  phone?: string | null;
  type: string;
  _count?: { salesOrders: number };
}): CustomerDTO {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone ?? null,
    type: customer.type,
    orderCount: customer._count?.salesOrders ?? 0,
  };
}
