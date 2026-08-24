import { getProducts } from "@/lib/actions/products";
import { getRawMaterials } from "@/lib/actions/raw-materials";
import { RecipeForm } from "@/components/forms/recipe-form";
import { PageHeader } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const [products, rawMaterials] = await Promise.all([
    getProducts(),
    getRawMaterials(),
  ]);

  return (
    <>
      <PageHeader title="Add Recipe" description="Create a new production recipe" />
      <RecipeForm
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        rawMaterials={rawMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
        }))}
      />
    </>
  );
}
