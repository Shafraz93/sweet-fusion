import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/actions/recipes";
import { getProducts } from "@/lib/actions/products";
import { getRawMaterials } from "@/lib/actions/raw-materials";
import { RecipeForm } from "@/components/forms/recipe-form";
import { PageHeader } from "@/components/ui/table";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
  const [recipe, products, rawMaterials] = await Promise.all([
    getRecipe(id),
    getProducts(),
    getRawMaterials(),
  ]);
  if (!recipe) notFound();

  return (
    <>
      <PageHeader title={`Edit ${recipe.name}`} description="Update recipe formula" />
      <RecipeForm
        recordId={id}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        rawMaterials={rawMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
        }))}
        initialData={{
          name: recipe.name,
          productId: recipe.productId,
          expectedOutputQty: toNumber(recipe.expectedOutputQty),
          outputUnit: recipe.outputUnit,
          notes: recipe.notes ?? "",
          isActive: recipe.isActive,
          ingredients: recipe.ingredients.map((ing) => ({
            rawMaterialId: ing.rawMaterialId,
            quantity: String(toNumber(ing.quantity)),
            unit: ing.unit,
          })),
        }}
      />
    </>
  );
}
