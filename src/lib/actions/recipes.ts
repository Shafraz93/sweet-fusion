"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UnitOfMeasure } from "@/generated/prisma";
import { toNumber } from "@/lib/utils";

export async function getRecipes() {
  return prisma.recipe.findMany({
    include: {
      product: true,
      ingredients: { include: { rawMaterial: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getRecipe(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: {
      product: true,
      ingredients: { include: { rawMaterial: true } },
    },
  });
}

export async function createRecipe(data: {
  name: string;
  productId: string;
  expectedOutputQty: number;
  outputUnit: UnitOfMeasure;
  notes?: string;
  ingredients: {
    rawMaterialId: string;
    quantity: number;
    unit: UnitOfMeasure;
  }[];
}) {
  const recipe = await prisma.recipe.create({
    data: {
      name: data.name,
      productId: data.productId,
      expectedOutputQty: data.expectedOutputQty,
      outputUnit: data.outputUnit,
      notes: data.notes,
      ingredients: { create: data.ingredients },
    },
    include: { ingredients: { include: { rawMaterial: true } } },
  });
  revalidatePath("/recipes");
  return recipe;
}

export async function updateRecipe(
  id: string,
  data: {
    name?: string;
    expectedOutputQty?: number;
    outputUnit?: UnitOfMeasure;
    notes?: string;
    isActive?: boolean;
    ingredients?: {
      rawMaterialId: string;
      quantity: number;
      unit: UnitOfMeasure;
    }[];
  }
) {
  if (data.ingredients) {
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await prisma.recipeIngredient.createMany({
      data: data.ingredients.map((ing) => ({ ...ing, recipeId: id })),
    });
  }

  const { ingredients: _, ...rest } = data;
  const recipe = await prisma.recipe.update({
    where: { id },
    data: rest,
    include: { ingredients: { include: { rawMaterial: true } } },
  });
  revalidatePath("/recipes");
  return recipe;
}

export async function estimateRecipeCost(recipeId: string) {
  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId },
    include: { ingredients: { include: { rawMaterial: true } } },
  });

  const ingredientCosts = recipe.ingredients.map((ing) => ({
    name: ing.rawMaterial.name,
    quantity: toNumber(ing.quantity),
    unitCost: toNumber(ing.rawMaterial.averageCost),
    totalCost: toNumber(ing.quantity) * toNumber(ing.rawMaterial.averageCost),
  }));

  const totalCost = ingredientCosts.reduce((s, i) => s + i.totalCost, 0);
  const costPerUnit =
    toNumber(recipe.expectedOutputQty) > 0
      ? totalCost / toNumber(recipe.expectedOutputQty)
      : 0;

  return { ingredientCosts, totalCost, costPerUnit };
}

export async function deleteRecipe(id: string) {
  await prisma.recipe.delete({ where: { id } });
  revalidatePath("/recipes");
}

export async function updateRecipeFromForm(data: Record<string, string>) {
  const id = data.id;
  if (!id) throw new Error("Missing recipe id");
  const ingredients = JSON.parse(data.ingredients) as {
    rawMaterialId: string;
    quantity: number;
    unit: UnitOfMeasure;
  }[];
  await updateRecipe(id, {
    name: data.name,
    expectedOutputQty: parseFloat(data.expectedOutputQty) || 0,
    outputUnit: data.outputUnit as UnitOfMeasure,
    notes: data.notes || undefined,
    isActive: data.isActive !== "false",
    ingredients,
  });
}

export async function createRecipeFromForm(data: Record<string, string>) {
  const ingredients = JSON.parse(data.ingredients) as {
    rawMaterialId: string;
    quantity: number;
    unit: UnitOfMeasure;
  }[];
  await createRecipe({
    name: data.name,
    productId: data.productId,
    expectedOutputQty: parseFloat(data.expectedOutputQty) || 0,
    outputUnit: data.outputUnit as UnitOfMeasure,
    notes: data.notes || undefined,
    ingredients,
  });
}
