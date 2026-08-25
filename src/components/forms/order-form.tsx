"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSalesOrderFromForm, updateSalesOrderFromForm } from "@/lib/actions/orders";
import { UNITS } from "@/lib/constants";
import { formatCurrency, normalizeDiscount } from "@/lib/utils";

interface ProductOption {
  id: string;
  name: string;
  unit: string;
  sellingPrice: number;
  unitCost: number;
}

interface PackagingOption {
  id: string;
  name: string;
  unit: string;
  averageCost: number;
}

interface OrderFormProps {
  customers: { id: string; name: string }[];
  products: ProductOption[];
  packagingMaterials: PackagingOption[];
  recordId?: string;
  initialData?: {
    customerId: string;
    orderDate: string;
    discount: number;
    paidAmount: number;
    notes?: string;
    items: LineItem[];
  };
}

interface PackagingLine {
  packagingMaterialId: string;
  quantityUsed: string;
  unit: string;
}

interface LineItem {
  productId: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  packaging: PackagingLine[];
}

const emptyPackaging = (): PackagingLine => ({
  packagingMaterialId: "",
  quantityUsed: "",
  unit: "PIECES",
});

const emptyItem = (): LineItem => ({
  productId: "",
  quantity: "",
  unit: "PIECES",
  unitPrice: "",
  packaging: [],
});

export function OrderForm({
  customers,
  products,
  packagingMaterials,
  recordId,
  initialData,
}: OrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>(
    initialData?.items?.length ? initialData.items : [emptyItem()]
  );
  const [discount, setDiscount] = useState(String(initialData?.discount ?? 0));
  const [paidAmount, setPaidAmount] = useState(String(initialData?.paidAmount ?? 0));
  const [paidInFull, setPaidInFull] = useState(false);
  const isEdit = Boolean(recordId);

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "productId") {
        const product = products.find((p) => p.id === value);
        if (product) {
          next[index].unit = product.unit;
          next[index].unitPrice = String(product.sellingPrice);
        }
      }
      return next;
    });
  };

  const updatePackaging = (
    itemIndex: number,
    pkgIndex: number,
    field: keyof PackagingLine,
    value: string
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const packaging = [...next[itemIndex].packaging];
      packaging[pkgIndex] = { ...packaging[pkgIndex], [field]: value };
      if (field === "packagingMaterialId") {
        const material = packagingMaterials.find((m) => m.id === value);
        if (material) {
          packaging[pkgIndex].unit = material.unit;
        }
      }
      next[itemIndex] = { ...next[itemIndex], packaging };
      return next;
    });
  };

  const addPackaging = (itemIndex: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[itemIndex] = {
        ...next[itemIndex],
        packaging: [...next[itemIndex].packaging, emptyPackaging()],
      };
      return next;
    });
  };

  const removePackaging = (itemIndex: number, pkgIndex: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[itemIndex] = {
        ...next[itemIndex],
        packaging: next[itemIndex].packaging.filter((_, i) => i !== pkgIndex),
      };
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
        packaging: item.packaging
          .filter((pkg) => pkg.packagingMaterialId && pkg.quantityUsed)
          .map((pkg) => ({
            packagingMaterialId: pkg.packagingMaterialId,
            quantityUsed: parseFloat(pkg.quantityUsed) || 0,
            unit: pkg.unit,
          })),
      }));

    if (parsedItems.length === 0) {
      setError("Add at least one product");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          customerId: formData.get("customerId")?.toString() ?? "",
          orderDate: formData.get("orderDate")?.toString() ?? "",
          discount: String(normalizeDiscount(discount)),
          paidAmount: paidAmount || "0",
          notes: formData.get("notes")?.toString() ?? "",
          items: JSON.stringify(parsedItems),
        };
        if (isEdit && recordId) {
          await updateSalesOrderFromForm({ ...payload, id: recordId });
        } else {
          await createSalesOrderFromForm(payload);
        }
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  };

  const today = new Date().toISOString().split("T")[0];

  const estimatePackagingLineCost = (pkg: PackagingLine): number => {
    if (!pkg.packagingMaterialId || !pkg.quantityUsed) return 0;
    const material = packagingMaterials.find((m) => m.id === pkg.packagingMaterialId);
    return (parseFloat(pkg.quantityUsed) || 0) * (material?.averageCost ?? 0);
  };

  const estimatePackagingCost = (item: LineItem): number =>
    item.packaging.reduce((sum, pkg) => sum + estimatePackagingLineCost(pkg), 0);

  const estimateLineCost = (item: LineItem): number => {
    const qty = parseFloat(item.quantity) || 0;
    if (qty <= 0 || !item.productId) return 0;

    const product = products.find((p) => p.id === item.productId);
    const productCost = (product?.unitCost ?? 0) * qty;
    return productCost + estimatePackagingCost(item);
  };

  const estimatedOrderCost = items.reduce((sum, item) => sum + estimateLineCost(item), 0);

  const estimateLineValue = (item: LineItem): number => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return qty * price;
  };

  const estimatedOrderValue = items.reduce(
    (sum, item) => sum + estimateLineValue(item),
    0
  );
  const discountAmount = normalizeDiscount(discount);
  const orderTotal = Math.max(0, estimatedOrderValue - discountAmount);

  useEffect(() => {
    if (!paidInFull) return;
    setPaidAmount(orderTotal > 0 ? orderTotal.toFixed(2) : "0");
  }, [paidInFull, orderTotal]);

  const handlePaidInFullChange = (checked: boolean) => {
    setPaidInFull(checked);
    if (checked) {
      setPaidAmount(orderTotal > 0 ? orderTotal.toFixed(2) : "0");
    }
  };

  const handlePaidAmountChange = (value: string) => {
    setPaidAmount(value);
    const amount = parseFloat(value) || 0;
    if (Math.abs(amount - orderTotal) > 0.009) {
      setPaidInFull(false);
    } else if (orderTotal > 0 && Math.abs(amount - orderTotal) <= 0.009) {
      setPaidInFull(true);
    }
  };

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Order" : "Order Details"}</CardTitle>
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
              id="orderDate"
              name="orderDate"
              type="date"
              label="Order Date"
              required
              defaultValue={initialData?.orderDate ?? today}
            />
            <Input
              id="discount"
              name="discount"
              type="number"
              step="0.01"
              min="0"
              label="Discount (Rs.)"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
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
                  Paid in full
                </label>
              </div>
              <input
                id="paidAmount"
                name="paidAmount"
                type="number"
                step="0.01"
                min="0"
                value={paidAmount}
                onChange={(e) => handlePaidAmountChange(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          <Textarea
            id="notes"
            name="notes"
            label="Notes"
            defaultValue={initialData?.notes ?? ""}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Order Items</h3>
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
                className="space-y-3 rounded-lg border border-slate-200 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-6">
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
                  <div>
                    <span className="mb-1 block text-xs font-medium text-slate-700">
                      Line Value
                    </span>
                    <div className="flex h-10 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900">
                      {estimateLineValue(item) > 0
                        ? formatCurrency(estimateLineValue(item))
                        : "—"}
                    </div>
                  </div>
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

                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Packaging Materials
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPackaging(index)}
                      disabled={packagingMaterials.length === 0}
                    >
                      <Plus className="h-3 w-3" />
                      Add Packaging
                    </Button>
                  </div>

                  {packagingMaterials.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Add packaging materials under Packaging before recording costs here.
                    </p>
                  ) : item.packaging.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No packaging added for this item.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {item.packaging.map((pkg, pkgIndex) => {
                        const material = packagingMaterials.find(
                          (m) => m.id === pkg.packagingMaterialId
                        );
                        const unitCost = material?.averageCost ?? 0;
                        const lineCost = estimatePackagingLineCost(pkg);

                        return (
                        <div
                          key={pkgIndex}
                          className="grid gap-2 sm:grid-cols-6"
                        >
                          <Select
                            label="Material"
                            options={[
                              { value: "", label: "Select..." },
                              ...packagingMaterials.map((m) => ({
                                value: m.id,
                                label: m.name,
                              })),
                            ]}
                            value={pkg.packagingMaterialId}
                            onChange={(e) =>
                              updatePackaging(
                                index,
                                pkgIndex,
                                "packagingMaterialId",
                                e.target.value
                              )
                            }
                          />
                          <Input
                            type="number"
                            step="0.001"
                            label="Qty Used"
                            value={pkg.quantityUsed}
                            onChange={(e) =>
                              updatePackaging(
                                index,
                                pkgIndex,
                                "quantityUsed",
                                e.target.value
                              )
                            }
                          />
                          <Select
                            label="Unit"
                            options={UNITS.map((u) => ({
                              value: u.value,
                              label: u.label,
                            }))}
                            value={pkg.unit}
                            onChange={(e) =>
                              updatePackaging(index, pkgIndex, "unit", e.target.value)
                            }
                          />
                          <div>
                            <span className="mb-1 block text-xs font-medium text-slate-700">
                              Unit Cost
                            </span>
                            <div className="flex h-10 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                              {pkg.packagingMaterialId
                                ? formatCurrency(unitCost)
                                : "—"}
                            </div>
                          </div>
                          <div>
                            <span className="mb-1 block text-xs font-medium text-slate-700">
                              Line Cost
                            </span>
                            <div className="flex h-10 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900">
                              {lineCost > 0 ? formatCurrency(lineCost) : "—"}
                            </div>
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removePackaging(index, pkgIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        );
                      })}

                      {item.packaging.length > 0 ? (
                        <p className="text-right text-xs text-slate-600">
                          Packaging subtotal:{" "}
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(estimatePackagingCost(item))}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  )}

                  {item.productId && item.quantity ? (
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {(() => {
                        const qty = parseFloat(item.quantity) || 0;
                        const product = products.find((p) => p.id === item.productId);
                        const productCost = (product?.unitCost ?? 0) * qty;
                        const packagingCost = estimatePackagingCost(item);
                        return (
                          <>
                            <p>
                              Product cost:{" "}
                              <span className="font-medium text-slate-900">
                                {formatCurrency(productCost)}
                              </span>
                              {product ? (
                                <span className="text-slate-500">
                                  {" "}
                                  ({formatCurrency(product.unitCost)}/unit × {qty})
                                </span>
                              ) : null}
                            </p>
                            <p>
                              Packaging cost:{" "}
                              <span className="font-medium text-slate-900">
                                {formatCurrency(packagingCost)}
                              </span>
                            </p>
                            <p>
                              Estimated line cost:{" "}
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(productCost + packagingCost)}
                              </span>
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {estimatedOrderValue > 0 ? (
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Subtotal:{" "}
                  <span className="font-medium text-slate-900">
                    {formatCurrency(estimatedOrderValue)}
                  </span>
                </span>
                {discountAmount > 0 ? (
                  <span>
                    Discount:{" "}
                    <span className="font-medium text-slate-900">
                      −{formatCurrency(discountAmount)}
                    </span>
                  </span>
                ) : null}
                <span>
                  Order value:{" "}
                  <span className="text-base font-semibold text-slate-900">
                    {formatCurrency(orderTotal)}
                  </span>
                </span>
              </div>
            </div>
          ) : null}

          {estimatedOrderCost > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Estimated total cost:{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(estimatedOrderCost)}
              </span>
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update Order" : "Create Order"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/orders")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
