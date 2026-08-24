"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dateFilterWhere } from "@/lib/date-utils";
import { toNumber, formatCurrency } from "@/lib/utils";
import { getLowStockAlerts } from "@/lib/inventory";

export async function getDashboardData(period = "month") {
  const dateWhere = dateFilterWhere(period, "orderDate");
  const purchaseDateWhere = dateFilterWhere(period, "purchaseDate");
  const productionDateWhere = dateFilterWhere(period, "productionDate");
  const expenseDateWhere = dateFilterWhere(period, "expenseDate");
  const packagingDateWhere = dateFilterWhere(period, "operationDate");

  const [
    salesOrders,
    wholesaleSupplies,
    purchases,
    productionBatches,
    expenses,
    packagingOps,
    products,
    rawMaterials,
    packagingMaterials,
    lowStock,
    customerBalances,
    supplierBalances,
  ] = await Promise.all([
    prisma.salesOrder.findMany({
      where: dateWhere,
      include: { items: true },
    }),
    prisma.wholesaleSupply.findMany({
      where: dateFilterWhere(period, "supplyDate"),
      include: { items: true },
    }),
    prisma.purchase.findMany({ where: purchaseDateWhere }),
    prisma.productionBatch.findMany({ where: productionDateWhere }),
    prisma.expense.findMany({ where: expenseDateWhere }),
    prisma.packagingOperation.findMany({ where: packagingDateWhere }),
    prisma.product.findMany({ where: { isActive: true } }),
    prisma.rawMaterial.findMany(),
    prisma.packagingMaterial.findMany(),
    getLowStockAlerts(),
    prisma.customer.findMany({
      include: {
        salesOrders: true,
        wholesaleSupplies: true,
      },
    }),
    prisma.supplier.findMany({ include: { purchases: true } }),
  ]);

  const retailSales = salesOrders.reduce(
    (sum, o) => sum + toNumber(o.totalAmount),
    0
  );
  const wholesaleSales = wholesaleSupplies.reduce(
    (sum, s) => sum + toNumber(s.totalAmount),
    0
  );
  const totalSales = retailSales + wholesaleSales;

  const totalPurchases = purchases.reduce(
    (sum, p) => sum + toNumber(p.totalAmount),
    0
  );
  const totalProductionCost = productionBatches.reduce(
    (sum, b) => sum + toNumber(b.totalCost),
    0
  );
  const orderPackagingCost = salesOrders.reduce(
    (sum, o) =>
      sum + o.items.reduce((s, i) => s + toNumber(i.packagingCost), 0),
    0
  );
  const operationPackagingCost = packagingOps.reduce(
    (sum, p) => sum + toNumber(p.totalPackagingCost),
    0
  );
  const totalPackagingCost = operationPackagingCost + orderPackagingCost;
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + toNumber(e.amount),
    0
  );

  const salesCost =
    salesOrders.reduce(
      (sum, o) =>
        sum + o.items.reduce((s, i) => s + toNumber(i.totalCost), 0),
      0
    ) +
    wholesaleSupplies.reduce(
      (sum, s) =>
        sum + s.items.reduce((acc, i) => acc + toNumber(i.totalCost), 0),
      0
    );

  const totalProfit =
    totalSales - salesCost - totalExpenses;

  const inventoryValue =
    products.reduce(
      (sum, p) => sum + toNumber(p.currentStock) * toNumber(p.averageCost),
      0
    ) +
    rawMaterials.reduce(
      (sum, r) => sum + toNumber(r.currentStock) * toNumber(r.averageCost),
      0
    ) +
    packagingMaterials.reduce(
      (sum, p) => sum + toNumber(p.currentStock) * toNumber(p.averageCost),
      0
    );

  const customerOutstanding = customerBalances.reduce((sum, c) => {
    const orderBal = c.salesOrders.reduce(
      (s, o) => s + toNumber(o.totalAmount) - toNumber(o.paidAmount),
      0
    );
    const wholesaleBal = c.wholesaleSupplies.reduce(
      (s, w) => s + toNumber(w.totalAmount) - toNumber(w.paidAmount),
      0
    );
    return sum + orderBal + wholesaleBal;
  }, 0);

  const supplierOutstanding = supplierBalances.reduce((sum, s) => {
    const bal = s.purchases.reduce(
      (acc, p) => acc + toNumber(p.totalAmount) - toNumber(p.paidAmount),
      0
    );
    return sum + bal;
  }, 0);

  const productPerformance = await prisma.salesOrderItem.groupBy({
    by: ["productId"],
    _sum: { totalPrice: true, quantity: true },
    orderBy: { _sum: { totalPrice: "desc" } },
    take: 5,
  });

  const productIds = productPerformance.map((p) => p.productId);
  const productNames = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });

  const topProducts = productPerformance.map((p) => ({
    name: productNames.find((n) => n.id === p.productId)?.name ?? "Unknown",
    revenue: toNumber(p._sum.totalPrice),
    quantity: toNumber(p._sum.quantity),
  }));

  return {
    stats: {
      totalSales,
      totalExpenses: totalExpenses + totalPurchases,
      totalPurchases,
      totalProductionCost,
      totalPackagingCost,
      inventoryValue,
      totalProfit,
      customerOutstanding,
      supplierOutstanding,
    },
    lowStock,
    topProducts,
    formatted: {
      totalSales: formatCurrency(totalSales),
      totalExpenses: formatCurrency(totalExpenses + totalPurchases),
      totalPurchases: formatCurrency(totalPurchases),
      totalProductionCost: formatCurrency(totalProductionCost),
      totalPackagingCost: formatCurrency(totalPackagingCost),
      inventoryValue: formatCurrency(inventoryValue),
      totalProfit: formatCurrency(totalProfit),
      customerOutstanding: formatCurrency(customerOutstanding),
      supplierOutstanding: formatCurrency(supplierOutstanding),
    },
  };
}

export async function revalidateDashboard() {
  revalidatePath("/");
}
