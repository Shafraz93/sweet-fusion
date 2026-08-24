import { PurchaseItemType } from "@/generated/prisma";
import { unitLabel } from "@/lib/constants";
import { toNumber } from "@/lib/utils";

type PurchaseItemWithRelations = {
  itemType: PurchaseItemType;
  quantity: Parameters<typeof toNumber>[0];
  unit: string;
  product?: { name: string } | null;
  rawMaterial?: { name: string } | null;
  packagingMaterial?: { name: string } | null;
};

export function getPurchaseItemName(item: PurchaseItemWithRelations): string {
  switch (item.itemType) {
    case PurchaseItemType.FINISHED_PRODUCT:
      return item.product?.name ?? "Unknown product";
    case PurchaseItemType.RAW_MATERIAL:
      return item.rawMaterial?.name ?? "Unknown raw material";
    case PurchaseItemType.PACKAGING:
      return item.packagingMaterial?.name ?? "Unknown packaging";
    default:
      return "Unknown item";
  }
}

export function formatPurchaseItemLine(item: PurchaseItemWithRelations): string {
  const qty = toNumber(item.quantity);
  const formattedQty =
    qty % 1 === 0 ? qty.toLocaleString("en-LK") : qty.toLocaleString("en-LK", { maximumFractionDigits: 3 });
  return `${getPurchaseItemName(item)} (${formattedQty} ${unitLabel(item.unit)})`;
}
