import { getProducts } from "@/lib/actions/products";
import { getRecipes } from "@/lib/actions/recipes";
import { getRawMaterials } from "@/lib/actions/raw-materials";
import { ProductionForm } from "@/components/forms/production-form";
import { PageHeader } from "@/components/ui/table";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewProductionPage() {
  const [products, recipes, rawMaterials] = await Promise.all([
    getProducts(),
    getRecipes(),
    getRawMaterials(),
  ]);

  return (
    <>
      <PageHeader
        title="Record Production"
        description="Log a new production batch"
      />
      <ProductionForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
        }))}
        recipes={recipes.map((r) => ({
          id: r.id,
          name: r.name,
          productId: r.productId,
          expectedOutputQty: toNumber(r.expectedOutputQty),
          outputUnit: r.outputUnit,
          ingredients: r.ingredients.map((ing) => ({
            rawMaterialId: ing.rawMaterialId,
            quantity: toNumber(ing.quantity),
            unit: ing.unit,
          })),
        }))}
        rawMaterials={rawMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
        }))}
      />
    </>
  );
}
