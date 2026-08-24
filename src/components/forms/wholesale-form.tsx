"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createWholesaleSupplyFromForm, updateWholesaleSupplyFromForm } from "@/lib/actions/wholesale";
import { UNITS } from "@/lib/constants";

interface ProductOption {
  id: string;
  name: string;
  unit: string;
  wholesalePrice: number;
}

interface WholesaleFormProps {
  customers: { id: string; name: string }[];
  products: ProductOption[];
  recordId?: string;
  initialData?: {
    customerId: string;
    supplyDate: string;
    dueDate?: string;
    paidAmount: number;
    notes?: string;
    items: LineItem[];
  };
}

interface LineItem {
  productId: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

const emptyItem = (): LineItem => ({
  productId: "",
  quantity: "",
  unit: "PIECES",
  unitPrice: "",
});

export function WholesaleForm({ customers, products, recordId, initialData }: WholesaleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>(
    initialData?.items?.length ? initialData.items : [emptyItem()]
  );
  const isEdit = Boolean(recordId);

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "productId") {
        const product = products.find((p) => p.id === value);
        if (product) {
          next[index].unit = product.unit;
          next[index].unitPrice = String(product.wholesalePrice);
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const parsedItems = items
      .filter((item) => item.productId && item.quantity)
      .map((item) => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit,
        unitPrice: parseFloat(item.unitPrice) || 0,
      }));

    if (parsedItems.length === 0) {
      setError("Add at least one product");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          customerId: formData.get("customerId")?.toString() ?? "",
          supplyDate: formData.get("supplyDate")?.toString() ?? "",
          dueDate: formData.get("dueDate")?.toString() ?? "",
          paidAmount: formData.get("paidAmount")?.toString() ?? "0",
          notes: formData.get("notes")?.toString() ?? "",
          items: JSON.stringify(parsedItems),
        };
        if (isEdit && recordId) {
          await updateWholesaleSupplyFromForm({ ...payload, id: recordId });
        } else {
          await createWholesaleSupplyFromForm(payload);
        }
        router.push("/wholesale");
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
        <CardTitle>{isEdit ? "Edit Wholesale Supply" : "Wholesale Supply Details"}</CardTitle>
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
              id="customerId"
              name="customerId"
              label="Customer"
              required
              defaultValue={initialData?.customerId ?? ""}
              options={[
                { value: "", label: "Select customer..." },
                ...customers.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Input
              id="supplyDate"
              name="supplyDate"
              type="date"
              label="Supply Date"
              required
              defaultValue={initialData?.supplyDate ?? today}
            />
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              label="Due Date"
              defaultValue={initialData?.dueDate ?? ""}
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
              <h3 className="text-sm font-semibold text-slate-900">Supply Items</h3>
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

            {items.map((item, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-5"
              >
                <Select
                  label="Product"
                  options={[
                    { value: "", label: "Select..." },
                    ...products.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  value={item.productId}
                  onChange={(e) => updateItem(index, "productId", e.target.value)}
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
                  label="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
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
            ))}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update Supply" : "Create Supply"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/wholesale")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
