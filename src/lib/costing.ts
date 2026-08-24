import { toNumber } from "@/lib/utils";

export interface CostBreakdown {
  purchaseCost: number;
  productionCost: number;
  packagingCost: number;
  totalCost: number;
  costPerUnit: number;
}

export function calculatePurchasedProductCost(
  purchaseUnitCost: number,
  packagingCostPerUnit: number,
  otherCostPerUnit = 0
): CostBreakdown {
  const totalCost = purchaseUnitCost + packagingCostPerUnit + otherCostPerUnit;
  return {
    purchaseCost: purchaseUnitCost,
    productionCost: 0,
    packagingCost: packagingCostPerUnit,
    totalCost,
    costPerUnit: totalCost,
  };
}

export function calculateManufacturedProductCost(
  ingredientCost: number,
  labourCost: number,
  otherCost: number,
  outputQuantity: number,
  packagingCostPerUnit = 0
): CostBreakdown {
  const productionCost = ingredientCost + labourCost + otherCost;
  const costPerUnit =
    outputQuantity > 0 ? productionCost / outputQuantity : 0;
  const totalCost = costPerUnit + packagingCostPerUnit;

  return {
    purchaseCost: 0,
    productionCost: costPerUnit,
    packagingCost: packagingCostPerUnit,
    totalCost,
    costPerUnit: totalCost,
  };
}

export function calculateProfitMetrics(
  sellingPrice: number,
  wholesalePrice: number,
  costPerUnit: number
) {
  const retailProfit = sellingPrice - costPerUnit;
  const wholesaleProfit = wholesalePrice - costPerUnit;
  const retailMargin =
    sellingPrice > 0 ? (retailProfit / sellingPrice) * 100 : 0;
  const wholesaleMargin =
    wholesalePrice > 0 ? (wholesaleProfit / wholesalePrice) * 100 : 0;

  return {
    retailProfit,
    wholesaleProfit,
    retailMargin,
    wholesaleMargin,
  };
}

export function scaleRecipeIngredients(
  recipeOutputQty: number,
  actualOutputQty: number,
  ingredients: Array<{ rawMaterialId: string; quantity: number; unitCost: number }>
) {
  const scale = actualOutputQty / recipeOutputQty;
  return ingredients.map((ing) => ({
    ...ing,
    quantityUsed: ing.quantity * scale,
    totalCost: ing.quantity * scale * ing.unitCost,
  }));
}

export function sumDecimalField<T>(
  items: T[],
  getter: (item: T) => unknown
): number {
  return items.reduce((sum, item) => sum + toNumber(getter(item) as number), 0);
}
