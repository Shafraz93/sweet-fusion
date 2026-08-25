"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPurchaseFromForm, updatePurchaseFromForm } from "@/lib/actions/purchases";
import { UNITS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

const ITEM_TYPES = [
  { value: "FINISHED_PRODUCT", label: "Finished Product" },
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "PACKAGING", label: "Packaging Material" },
];

interface ItemOption {
  id: string;
  name: string;
  unit: string;
}

interface PurchaseFormProps {
  suppliers: { id: string; name: string }[];
  products: ItemOption[];
  rawMaterials: ItemOption[];
  packagingMaterials: ItemOption[];
  recordId?: string;
  initialData?: {
    supplierId: string;
    purchaseDate: string;
    invoiceRef?: string;
    paidAmount: number;
    notes?: string;
    items: LineItem[];
  };
}

interface LineItem {
  itemType: string;
  itemId: string;
  quantity: string;
  unit: string;
  unitCost: string;
}

const emptyItem = (): LineItem => ({
  itemType: "RAW_MATERIAL",
  itemId: "",
  quantity: "",
  unit: "KILOGRAMS",
  unitCost: "",
});

function normalizePaidAmount(value: string | number): string {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return "0";
  return String(Math.round(n));
}

function syncUnitCostFromPaidAmount(
  paid: string,
  lineItems: LineItem[]
): LineItem[] {
  const paidNum = parseInt(normalizePaidAmount(paid), 10) || 0;
  const activeLines = lineItems.filter(
    (item) => item.itemId && (parseFloat(item.quantity) || 0) > 0
  );

  if (activeLines.length !== 1 || paidNum <= 0) return lineItems;

  const index = lineItems.findIndex(
    (item) => item.itemId && (parseFloat(item.quantity) || 0) > 0
  );
  if (index < 0) return lineItems;

  const qty = parseFloat(lineItems[index].quantity) || 0;
  if (qty <= 0) return lineItems;

  const next = [...lineItems];
  next[index] = {
    ...next[index],
    unitCost: (paidNum / qty).toFixed(2),
  };
  return next;
}

export function PurchaseForm({
  suppliers,
  products,
  rawMaterials,
  packagingMaterials,
  recordId,
  initialData,
}: PurchaseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>(
    initialData?.items?.length ? initialData.items : [emptyItem()]
  );
  const [paidAmount, setPaidAmount] = useState(
    normalizePaidAmount(initialData?.paidAmount ?? 0)
  );
  const [paidInFull, setPaidInFull] = useState(false);
  const isEdit = Boolean(recordId);

  const estimateLineTotal = (item: LineItem): number => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.unitCost) || 0;
    return qty * cost;
  };

  const purchaseTotal = items.reduce(
    (sum, item) => sum + estimateLineTotal(item),
    0
  );
  const roundedPurchaseTotal = Math.round(purchaseTotal);

  useEffect(() => {
    if (!paidInFull) return;
    setPaidAmount(
      roundedPurchaseTotal > 0 ? String(roundedPurchaseTotal) : "0"
    );
  }, [paidInFull, roundedPurchaseTotal]);

  const getOptions = (type: string) => {
    switch (type) {
      case "FINISHED_PRODUCT":
        return products;
      case "RAW_MATERIAL":
        return rawMaterials;
      case "PACKAGING":
        return packagingMaterials;
      default:
        return [];
    }
  };

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "itemType") {
        next[index].itemId = "";
      }
      if (field === "itemId") {
        const opts = getOptions(next[index].itemType);
        const selected = opts.find((o) => o.id === value);
        if (selected) next[index].unit = selected.unit;
      }
      if (field === "quantity" || field === "itemId") {
        if (!paidInFull) {
          return syncUnitCostFromPaidAmount(paidAmount, next);
        }
      }
      return next;
    });
  };

  const handlePaidInFullChange = (checked: boolean) => {
    setPaidInFull(checked);
    if (checked) {
      setPaidAmount(
        roundedPurchaseTotal > 0 ? String(roundedPurchaseTotal) : "0"
      );
    }
  };

  const handlePaidAmountChange = (value: string) => {
    const paid = normalizePaidAmount(value);
    setPaidAmount(paid);
    const amount = parseInt(paid, 10) || 0;
    if (
      roundedPurchaseTotal > 0 &&
      amount === roundedPurchaseTotal
    ) {
      setPaidInFull(true);
    } else {
      setPaidInFull(false);
      setItems((prev) => syncUnitCostFromPaidAmount(paid, prev));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const parsedItems = items
      .filter((item) => item.itemId && item.quantity)
      .map((item) => ({
        itemType: item.itemType,
        productId: item.itemType === "FINISHED_PRODUCT" ? item.itemId : undefined,
        rawMaterialId: item.itemType === "RAW_MATERIAL" ? item.itemId : undefined,
        packagingMaterialId: item.itemType === "PACKAGING" ? item.itemId : undefined,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit,
        unitCost: parseFloat(item.unitCost) || 0,
      }));

    if (parsedItems.length === 0) {
      setError("Add at least one item");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          supplierId: formData.get("supplierId")?.toString() ?? "",
          purchaseDate: formData.get("purchaseDate")?.toString() ?? "",
          invoiceRef: formData.get("invoiceRef")?.toString() ?? "",
          paidAmount: paidAmount || "0",
          notes: formData.get("notes")?.toString() ?? "",
          items: JSON.stringify(parsedItems),
        };
        if (isEdit && recordId) {
          await updatePurchaseFromForm({ ...payload, id: recordId });
        } else {
          await createPurchaseFromForm(payload);
        }
        router.push("/purchases");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Purchase" : "Purchase Details"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="supplierId"
              name="supplierId"
              label="Supplier"
              required
              defaultValue={initialData?.supplierId ?? ""}
              options={[
                { value: "", label: "Select supplier..." },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <Input
              id="purchaseDate"
              name="purchaseDate"
              type="date"
              label="Purchase Date"
              required
              defaultValue={initialData?.purchaseDate ?? today}
            />
            <Input
              id="invoiceRef"
              name="invoiceRef"
              label="Invoice Reference"
              defaultValue={initialData?.invoiceRef ?? ""}
            />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="paidAmount"
                  className="block text-sm font-medium text-slate-700"
                >
                  Paid Amount (Rs.)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={paidInFull}
                    onChange={(e) => handlePaidInFullChange(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500/20"
                  />
                  Fully paid
                </label>
              </div>
              <input
                id="paidAmount"
                name="paidAmount"
                type="number"
                step="1"
                min="0"
                inputMode="numeric"
                value={paidAmount}
                onChange={(e) => handlePaidAmountChange(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          {purchaseTotal > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Purchase total:{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(purchaseTotal)}
              </span>
            </div>
          ) : null}

          <Textarea
            id="notes"
            name="notes"
            label="Notes"
            defaultValue={initialData?.notes ?? ""}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Unit cost is per single unit (e.g. one piece), not the full box or bag
              price. With one line item, paid amount ÷ quantity updates unit cost
              automatically.
            </p>

            {items.map((item, index) => {
              const options = getOptions(item.itemType);
              return (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-6"
                >
                  <Select
                    label="Type"
                    options={ITEM_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                    value={item.itemType}
                    onChange={(e) => updateItem(index, "itemType", e.target.value)}
                  />
                  <Select
                    label="Item"
                    options={[
                      { value: "", label: "Select..." },
                      ...options.map((o) => ({ value: o.id, label: o.name })),
                    ]}
                    value={item.itemId}
                    onChange={(e) => updateItem(index, "itemId", e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.001"
                    label="Quantity"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  />
                  <Select
                    label="Unit"
                    options={UNITS.map((u) => ({ value: u.value, label: u.label }))}
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    label="Unit Cost"
                    value={item.unitCost}
                    onChange={(e) => updateItem(index, "unitCost", e.target.value)}
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== index))
                      }
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update Purchase" : "Create Purchase"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/purchases")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
