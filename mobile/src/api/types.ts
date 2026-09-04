/** Mirrors the DTOs returned by the Next.js API in src/lib/api/dto.ts. */

export interface OrderListItem {
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

export interface OrderDetailLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  cost: number;
}

export interface OrderDetail extends OrderListItem {
  notes: string | null;
  items: OrderDetailLine[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  sellingPrice: number;
  wholesalePrice: number;
  currentStock: number;
  categoryName: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  type: string;
  orderCount: number;
}

export interface NewOrderLine {
  productId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface NewOrderPayload {
  customerId: string;
  orderDate: string;
  discount?: number;
  paidAmount?: number;
  notes?: string;
  items: NewOrderLine[];
}
