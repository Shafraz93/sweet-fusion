"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPurchaseFromForm, updatePurchaseFromForm } from "@/lib/actions/purchases";
import { UNITS } from "@/lib/constants";

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
  const isEdit = Boolean(recordId);

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
      return next;
    });
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
          paidAmount: formData.get("paidAmount")?.toString() ?? "0",
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
            <Input
              id="paidAmount"
              name="paidAmount"
              type="number"
              step="0.01"
              label="Paid Amount (Rs.)"
              defaultValue={String(initialData?.paidAmount ?? 0)}
            />
          </div>

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
              Unit cost is per single unit (e.g. one piece), not the full box or bag price.
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
