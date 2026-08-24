import { formatPurchaseItemLine } from "@/lib/purchase-items";
import type { PurchaseItemType } from "@/generated/prisma";

type PurchaseItemRow = {
  id: string;
  itemType: PurchaseItemType;
  quantity: Parameters<typeof formatPurchaseItemLine>[0]["quantity"];
  unit: string;
  product?: { name: string } | null;
  rawMaterial?: { name: string } | null;
  packagingMaterial?: { name: string } | null;
};

export function PurchaseItemsList({ items }: { items: PurchaseItemRow[] }) {
  if (items.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.id} className="text-sm text-slate-700">
          {formatPurchaseItemLine(item)}
        </li>
      ))}
    </ul>
  );
}
