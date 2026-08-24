"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProductionBatchFromForm } from "@/lib/actions/production";
import { UNITS } from "@/lib/constants";

interface RawMaterialOption {
  id: string;
  name: string;
  unit: string;
}

interface RecipeOption {
  id: string;
  name: string;
  productId: string;
  expectedOutputQty: number;
  outputUnit: string;
  ingredients: { rawMaterialId: string; quantity: number; unit: string }[];
}

interface ProductionFormProps {
  products: { id: string; name: string; unit: string }[];
  recipes: RecipeOption[];
  rawMaterials: RawMaterialOption[];
}

interface IngredientRow {
  rawMaterialId: string;
  quantityUsed: string;
  unit: string;
}

const emptyIngredient = (): IngredientRow => ({
  rawMaterialId: "",
  quantityUsed: "",
  unit: "KILOGRAMS",
});

export function ProductionForm({
  products,
  recipes,
  rawMaterials,
}: ProductionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    emptyIngredient(),
  ]);

  const handleRecipeChange = (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    setIngredients(
      recipe.ingredients.map((ing) => ({
        rawMaterialId: ing.rawMaterialId,
        quantityUsed: String(ing.quantity),
        unit: ing.unit,
      }))
    );
  };

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
      .filter((ing) => ing.rawMaterialId && ing.quantityUsed)
      .map((ing) => ({
        rawMaterialId: ing.rawMaterialId,
        quantityUsed: parseFloat(ing.quantityUsed) || 0,
        unit: ing.unit,
      }));

    if (parsedIngredients.length === 0) {
      setError("Add at least one ingredient");
      return;
    }

    startTransition(async () => {
      try {
        await createProductionBatchFromForm({
          productId: formData.get("productId")?.toString() ?? "",
          recipeId: formData.get("recipeId")?.toString() ?? "",
          productionDate: formData.get("productionDate")?.toString() ?? "",
          outputQuantity: formData.get("outputQuantity")?.toString() ?? "0",
          outputUnit: formData.get("outputUnit")?.toString() ?? "PIECES",
          labourCost: formData.get("labourCost")?.toString() ?? "0",
          otherCost: formData.get("otherCost")?.toString() ?? "0",
          notes: formData.get("notes")?.toString() ?? "",
          ingredients: JSON.stringify(parsedIngredients),
        });
        router.push("/production");
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
        <CardTitle>Production Batch</CardTitle>
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
              id="productId"
              name="productId"
              label="Product"
              required
              options={[
                { value: "", label: "Select product..." },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <Select
              id="recipeId"
              name="recipeId"
              label="Recipe (optional)"
              options={[
                { value: "", label: "No recipe / manual" },
                ...recipes.map((r) => ({ value: r.id, label: r.name })),
              ]}
              onChange={(e) => handleRecipeChange(e.target.value)}
            />
            <Input
              id="productionDate"
              name="productionDate"
              type="date"
              label="Production Date"
              required
              defaultValue={today}
            />
            <Input
              id="outputQuantity"
              name="outputQuantity"
              type="number"
              step="0.001"
              label="Output Quantity"
              required
            />
            <Select
              id="outputUnit"
              name="outputUnit"
              label="Output Unit"
              required
              options={UNITS.map((u) => ({ value: u.value, label: u.label }))}
            />
            <Input
              id="labourCost"
              name="labourCost"
              type="number"
              step="0.01"
              label="Labour Cost (Rs.)"
              defaultValue="0"
            />
            <Input
              id="otherCost"
              name="otherCost"
              type="number"
              step="0.01"
              label="Other Cost (Rs.)"
              defaultValue="0"
            />
          </div>

          <Textarea id="notes" name="notes" label="Notes" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Raw Materials Used
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setIngredients((prev) => [...prev, emptyIngredient()])
                }
              >
                <Plus className="h-4 w-4" />
                Add Material
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
                  label="Quantity Used"
                  value={ing.quantityUsed}
                  onChange={(e) =>
                    updateIngredient(index, "quantityUsed", e.target.value)
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
              {isPending ? "Saving..." : "Record Production"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/production")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
