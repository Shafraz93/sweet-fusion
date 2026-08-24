"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createRecipeFromForm, updateRecipeFromForm } from "@/lib/actions/recipes";
import { UNITS } from "@/lib/constants";

interface RawMaterialOption {
  id: string;
  name: string;
  unit: string;
}

interface RecipeFormProps {
  products: { id: string; name: string }[];
  rawMaterials: RawMaterialOption[];
  recordId?: string;
  initialData?: {
    name: string;
    productId: string;
    expectedOutputQty: number;
    outputUnit: string;
    notes?: string;
    isActive?: boolean;
    ingredients: IngredientRow[];
  };
}

interface IngredientRow {
  rawMaterialId: string;
  quantity: string;
  unit: string;
}

const emptyIngredient = (): IngredientRow => ({
  rawMaterialId: "",
  quantity: "",
  unit: "KILOGRAMS",
});

export function RecipeForm({ products, rawMaterials, recordId, initialData }: RecipeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialData?.ingredients?.length ? initialData.ingredients : [emptyIngredient()]
  );
  const isEdit = Boolean(recordId);

  const updateIngredient = (
    index: number,
    field: keyof IngredientRow,
    value: string
  ) => {
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "rawMaterialId") {
        const material = rawMaterials.find((m) => m.id === value);
        if (material) next[index].unit = material.unit;
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const parsedIngredients = ingredients
      .filter((ing) => ing.rawMaterialId && ing.quantity)
      .map((ing) => ({
        rawMaterialId: ing.rawMaterialId,
        quantity: parseFloat(ing.quantity) || 0,
        unit: ing.unit,
      }));

    if (parsedIngredients.length === 0) {
      setError("Add at least one ingredient");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name: formData.get("name")?.toString() ?? "",
          productId: formData.get("productId")?.toString() ?? initialData?.productId ?? "",
          expectedOutputQty: formData.get("expectedOutputQty")?.toString() ?? "0",
          outputUnit: formData.get("outputUnit")?.toString() ?? "PIECES",
          notes: formData.get("notes")?.toString() ?? "",
          isActive: formData.get("isActive") === "on" ? "true" : "false",
          ingredients: JSON.stringify(parsedIngredients),
        };
        if (isEdit && recordId) {
          await updateRecipeFromForm({ ...payload, id: recordId });
        } else {
          await createRecipeFromForm(payload);
        }
        router.push("/recipes");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  };

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Recipe" : "Recipe Details"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="name"
              name="name"
              label="Recipe Name"
              required
              defaultValue={initialData?.name ?? ""}
            />
            {isEdit ? (
              <>
                <input type="hidden" name="productId" value={initialData?.productId ?? ""} />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Output Product</label>
                  <p className="text-sm text-slate-600">
                    {products.find((p) => p.id === initialData?.productId)?.name ?? "—"}
                  </p>
                </div>
              </>
            ) : (
              <Select
                id="productId"
                name="productId"
                label="Output Product"
                required
                options={[
                  { value: "", label: "Select product..." },
                  ...products.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            )}
            <Input
              id="expectedOutputQty"
              name="expectedOutputQty"
              type="number"
              step="0.001"
              label="Expected Output Quantity"
              required
              defaultValue={String(initialData?.expectedOutputQty ?? "")}
            />
            <Select
              id="outputUnit"
              name="outputUnit"
              label="Output Unit"
              required
              defaultValue={initialData?.outputUnit ?? "PIECES"}
              options={UNITS.map((u) => ({ value: u.value, label: u.label }))}
            />
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                defaultChecked={initialData?.isActive !== false}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                Active recipe
              </label>
            </div>
          )}

          <Textarea
            id="notes"
            name="notes"
            label="Notes"
            defaultValue={initialData?.notes ?? ""}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Ingredients</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setIngredients((prev) => [...prev, emptyIngredient()])
                }
              >
                <Plus className="h-4 w-4" />
                Add Ingredient
              </Button>
            </div>

            {ingredients.map((ing, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-4"
              >
                <Select
                  label="Raw Material"
                  options={[
                    { value: "", label: "Select..." },
                    ...rawMaterials.map((m) => ({ value: m.id, label: m.name })),
                  ]}
                  value={ing.rawMaterialId}
                  onChange={(e) =>
                    updateIngredient(index, "rawMaterialId", e.target.value)
                  }
                />
                <Input
                  type="number"
                  step="0.001"
                  label="Quantity"
                  value={ing.quantity}
                  onChange={(e) =>
                    updateIngredient(index, "quantity", e.target.value)
                  }
                />
                <Select
                  label="Unit"
                  options={UNITS.map((u) => ({ value: u.value, label: u.label }))}
                  value={ing.unit}
                  onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setIngredients((prev) => prev.filter((_, i) => i !== index))
                    }
                    disabled={ingredients.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update Recipe" : "Create Recipe"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/recipes")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
