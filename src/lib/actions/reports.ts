"use server";

import { prisma } from "@/lib/prisma";
import { dateFilterWhere } from "@/lib/date-utils";
import { toNumber } from "@/lib/utils";

export async function getSalesReport(period = "month") {
  const dateWhere = dateFilterWhere(period, "orderDate");
  const orders = await prisma.salesOrder.findMany({
    where: dateWhere,
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { orderDate: "desc" },
  });

  const total = orders.reduce((s, o) => s + toNumber(o.totalAmount), 0);

  return { orders, total };
}

export async function getPurchaseReport(period = "month") {
  return prisma.purchase.findMany({
    where: dateFilterWhere(period, "purchaseDate"),
    include: {
      supplier: true,
      items: { include: { product: true, rawMaterial: true, packagingMaterial: true } },
    },
    orderBy: { purchaseDate: "desc" },
  });
}

export async function getProductionReport(period = "month") {
  return prisma.productionBatch.findMany({
    where: dateFilterWhere(period, "productionDate"),
    include: {
      product: true,
      ingredients: { include: { rawMaterial: true } },
    },
    orderBy: { productionDate: "desc" },
  });
}

export async function getProfitReport(period = "month") {
  const [sales, expenses, production, packaging] = await Promise.all([
    prisma.salesOrder.findMany({
      where: dateFilterWhere(period, "orderDate"),
      include: { items: true },
    }),
    prisma.expense.findMany({ where: dateFilterWhere(period, "expenseDate") }),
    prisma.productionBatch.findMany({
      where: dateFilterWhere(period, "productionDate"),
    }),
    prisma.packagingOperation.findMany({
      where: dateFilterWhere(period, "operationDate"),
    }),
  ]);

  const revenue = sales.reduce((s, o) => s + toNumber(o.totalAmount), 0);

  const cogs = sales.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + toNumber(i.totalCost), 0),
    0
  );

  const totalExpenses = expenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const productionCost = production.reduce((s, p) => s + toNumber(p.totalCost), 0);
  const operationPackagingCost = packaging.reduce(
    (s, p) => s + toNumber(p.totalPackagingCost),
    0
  );
  const orderPackagingCost = sales.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + toNumber(i.packagingCost), 0),
    0
  );
  const packagingCost = operationPackagingCost + orderPackagingCost;

  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - totalExpenses;

  return {
    revenue,
    cogs,
    grossProfit,
    totalExpenses,
    productionCost,
    packagingCost,
    netProfit,
  };
}

export async function getInventoryReport() {
  const [products, rawMaterials, packagingMaterials] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, include: { category: true } }),
    prisma.rawMaterial.findMany(),
    prisma.packagingMaterial.findMany(),
  ]);

  return { products, rawMaterials, packagingMaterials };
}

export async function exportReportCSV(
  type: "sales" | "purchases" | "inventory" | "profit",
  period = "month"
): Promise<string> {
  switch (type) {
    case "sales": {
      const { orders } = await getSalesReport(period);
      const rows = [
        "Number,Date,Customer,Amount,Status",
        ...orders.map(
          (o) =>
            `${o.orderNumber},${o.orderDate.toISOString().split("T")[0]},${o.customer.name},${toNumber(o.totalAmount)},${o.paymentStatus}`
        ),
      ];
      return rows.join("\n");
    }
    case "purchases": {
      const purchases = await getPurchaseReport(period);
      const rows = [
        "Number,Date,Supplier,Amount,Status",
        ...purchases.map(
          (p) =>
            `${p.purchaseNumber},${p.purchaseDate.toISOString().split("T")[0]},${p.supplier.name},${toNumber(p.totalAmount)},${p.paymentStatus}`
        ),
      ];
      return rows.join("\n");
    }
    case "inventory": {
      const { products, rawMaterials, packagingMaterials } =
        await getInventoryReport();
      const rows = [
        "Type,Name,Stock,Unit,Avg Cost,Value",
        ...products.map(
          (p) =>
            `Product,${p.name},${toNumber(p.currentStock)},${p.unit},${toNumber(p.averageCost)},${toNumber(p.currentStock) * toNumber(p.averageCost)}`
        ),
        ...rawMaterials.map(
          (r) =>
            `Raw Material,${r.name},${toNumber(r.currentStock)},${r.unit},${toNumber(r.averageCost)},${toNumber(r.currentStock) * toNumber(r.averageCost)}`
        ),
        ...packagingMaterials.map(
          (p) =>
            `Packaging,${p.name},${toNumber(p.currentStock)},${p.unit},${toNumber(p.averageCost)},${toNumber(p.currentStock) * toNumber(p.averageCost)}`
        ),
      ];
      return rows.join("\n");
    }
    case "profit": {
      const profit = await getProfitReport(period);
      return [
        "Metric,Amount",
        `Revenue,${profit.revenue}`,
        `COGS,${profit.cogs}`,
        `Gross Profit,${profit.grossProfit}`,
        `Expenses,${profit.totalExpenses}`,
        `Net Profit,${profit.netProfit}`,
      ].join("\n");
    }
    default:
      return "";
  }
}
