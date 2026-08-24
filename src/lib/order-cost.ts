import { toNumber } from "@/lib/utils";
import { getProductInventoryUnitCost } from "@/lib/inventory";

type OrderLineCostInput = {
  quantity: Parameters<typeof toNumber>[0];
  unitCost: Parameters<typeof toNumber>[0];
  totalCost: Parameters<typeof toNumber>[0];
  packagingCost: Parameters<typeof toNumber>[0];
};

type OrderLineDisplayInput = OrderLineCostInput & {
  productId: string;
};

/** Use costs frozen on the order line — never today's product average. */
export function getOrderLineCost(item: OrderLineCostInput): number {
  const storedTotal = toNumber(item.totalCost);
  if (storedTotal > 0) return storedTotal;

  const qty = toNumber(item.quantity);
  const storedUnit = toNumber(item.unitCost);
  if (storedUnit > 0) return storedUnit * qty;

  return toNumber(item.packagingCost);
}

export function getOrderTotalCost(items: OrderLineCostInput[]): number {
  return items.reduce((sum, item) => sum + getOrderLineCost(item), 0);
}

export function getOrderTotalPackagingCost(
  items: Array<{ packagingCost: Parameters<typeof toNumber>[0] }>
): number {
  return items.reduce((sum, item) => sum + toNumber(item.packagingCost), 0);
}

export function getOrderProductCost(item: OrderLineCostInput): number {
  const lineCost = getOrderLineCost(item);
  const packaging = toNumber(item.packagingCost);
  return Math.max(0, lineCost - packaging);
}

/** Cost from inventory lots + saved packaging (fixes legacy bad stored costs). */
export async function getOrderLineDisplayCost(
  item: OrderLineDisplayInput
): Promise<number> {
  const qty = toNumber(item.quantity);
  const packaging = toNumber(item.packagingCost);
  const unitCost = await getProductInventoryUnitCost(item.productId);
  return qty * unitCost + packaging;
}

export async function getOrderDisplayTotalCost(
  items: OrderLineDisplayInput[]
): Promise<number> {
  let total = 0;
  for (const item of items) {
    total += await getOrderLineDisplayCost(item);
  }
  return total;
}
