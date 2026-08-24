import Link from "next/link";
import { Plus } from "lucide-react";
import { getRecipes } from "@/lib/actions/recipes";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  PageHeader,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
} from "@/components/ui/table";
import { toNumber } from "@/lib/utils";
import { unitLabel } from "@/lib/constants";
import { EditLink } from "@/components/ui/edit-link";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return (
    <>
      <PageHeader
        title="Recipes"
        description="Production recipes and ingredient lists"
        action={
          <Link href="/recipes/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Recipe
            </Button>
          </Link>
        }
      />

      {recipes.length === 0 ? (
        <EmptyState
          title="No recipes yet"
          description="Create recipes for your manufactured products"
          action={
            <Link href="/recipes/new">
              <Button>Add Recipe</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Recipe</TH>
              <TH>Product</TH>
              <TH>Output</TH>
              <TH>Ingredients</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {recipes.map((recipe) => (
              <TR key={recipe.id}>
                <TD className="font-medium">{recipe.name}</TD>
                <TD>
                  <Link
                    href={`/products/${recipe.productId}`}
                    className="text-rose-600 hover:underline"
                  >
                    {recipe.product.name}
                  </Link>
                </TD>
                <TD>
                  {toNumber(recipe.expectedOutputQty)}{" "}
                  {unitLabel(recipe.outputUnit)}
                </TD>
                <TD>
                  <Badge variant="info">{recipe.ingredients.length}</Badge>
                </TD>
                <TD>
                  <StatusBadge active={recipe.isActive} />
                </TD>
                <TD>
                  <EditLink href={`/recipes/${recipe.id}/edit`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
