import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getDashboardData } from "../src/lib/actions/dashboard";
import { getOrderDisplayTotalCost } from "../src/lib/order-cost";
import { toNumber } from "../src/lib/utils";
import { startOfMonth } from "date-fns";

async function main() {
  const data = await getDashboardData("month");
  console.log("=== DASHBOARD (month) ===");
  console.log(JSON.stringify(data.stats, null, 2));

  const monthStart = startOfMonth(new Date());

  const orders = await prisma.salesOrder.findMany({
    where: { orderDate: { gte: monthStart } },
    include: { items: true },
    orderBy: { orderNumber: "asc" },
  });

  console.log("\n=== SALES ORDERS ===");
  let salesSum = 0;
  let storedCostSum = 0;
  let displayCostSum = 0;
  let packagingSum = 0;
  for (const o of orders) {
    const displayCost = await getOrderDisplayTotalCost(o.items);
    const storedCost = o.items.reduce((s, i) => s + toNumber(i.totalCost), 0);
    const pkg = o.items.reduce((s, i) => s + toNumber(i.packagingCost), 0);
    salesSum += toNumber(o.totalAmount);
    storedCostSum += storedCost;
    displayCostSum += displayCost;
    packagingSum += pkg;
    console.log(
      o.orderNumber,
      "sell:",
      toNumber(o.totalAmount),
      "storedCost:",
      storedCost,
      "displayCost:",
      displayCost.toFixed(2),
      "packaging:",
      pkg
    );
  }
  console.log(
    "Totals — sales:",
    salesSum,
    "stored cost:",
    storedCostSum,
    "display cost:",
    displayCostSum.toFixed(2),
    "packaging:",
    packagingSum
  );

  const wholesale = await prisma.wholesaleSupply.findMany({
    where: { supplyDate: { gte: monthStart } },
    include: { items: true },
  });
  const wholesaleSales = wholesale.reduce((s, w) => s + toNumber(w.totalAmount), 0);
  const wholesaleStoredCost = wholesale.reduce(
    (sum, w) =>
      sum + w.items.reduce((acc, i) => acc + toNumber(i.totalCost), 0),
    0
  );
  console.log("\n=== WHOLESALE ===", wholesale.length, "supplies, sales:", wholesaleSales, "cost:", wholesaleStoredCost);

  const purchases = await prisma.purchase.findMany({
    where: { purchaseDate: { gte: monthStart } },
  });
  console.log(
    "\n=== PURCHASES ===",
    purchases.reduce((s, p) => s + toNumber(p.totalAmount), 0)
  );

  const batches = await prisma.productionBatch.findMany({
    where: { productionDate: { gte: monthStart } },
  });
  console.log(
    "=== PRODUCTION ===",
    batches.reduce((s, b) => s + toNumber(b.totalCost), 0)
  );

  const expenses = await prisma.expense.findMany({
    where: { expenseDate: { gte: monthStart } },
  });
  const expenseTotal = expenses.reduce((s, e) => s + toNumber(e.amount), 0);
  console.log("=== EXPENSES ===", expenseTotal);

  const products = await prisma.product.findMany({ where: { isActive: true } });
  const rawMaterials = await prisma.rawMaterial.findMany();
  const packagingMaterials = await prisma.packagingMaterial.findMany();

  console.log("\n=== INVENTORY VALUE breakdown ===");
  let invTotal = 0;
  for (const p of products) {
    const val = toNumber(p.currentStock) * toNumber(p.averageCost);
    invTotal += val;
    if (val > 0 || toNumber(p.currentStock) > 0) {
      console.log(
        "Product:",
        p.name,
        "stock:",
        toNumber(p.currentStock),
        "avgCost:",
        toNumber(p.averageCost),
        "value:",
        val.toFixed(2)
      );
    }
  }
  for (const r of rawMaterials) {
    const val = toNumber(r.currentStock) * toNumber(r.averageCost);
    invTotal += val;
    if (val > 0) {
      console.log("Raw:", r.name, "value:", val.toFixed(2));
    }
  }
  for (const p of packagingMaterials) {
    const val = toNumber(p.currentStock) * toNumber(p.averageCost);
    invTotal += val;
    if (val > 0) {
      console.log("Packaging:", p.name, "value:", val.toFixed(2));
    }
  }
  console.log("Computed inventory total:", invTotal.toFixed(2));

  const customers = await prisma.customer.findMany({
    include: { salesOrders: true, wholesaleSupplies: true },
  });
  console.log("\n=== CUSTOMER OUTSTANDING detail ===");
  for (const c of customers) {
    const bal =
      c.salesOrders.reduce(
        (s, o) => s + toNumber(o.totalAmount) - toNumber(o.paidAmount),
        0
      ) +
      c.wholesaleSupplies.reduce(
        (s, w) => s + toNumber(w.totalAmount) - toNumber(w.paidAmount),
        0
      );
    if (Math.abs(bal) > 0.01) console.log(c.name, bal);
  }

  const suppliers = await prisma.supplier.findMany({
    include: { purchases: true },
  });
  console.log("\n=== SUPPLIER OUTSTANDING detail ===");
  for (const s of suppliers) {
    const bal = s.purchases.reduce(
      (acc, p) => acc + toNumber(p.totalAmount) - toNumber(p.paidAmount),
      0
    );
    if (Math.abs(bal) > 0.01) console.log(s.name, bal);
  }

  const totalSales = salesSum + wholesaleSales;
  console.log("\n=== PROFIT RECALC ===");
  console.log(
    "Dashboard formula (stored costs):",
    totalSales,
    "-",
    storedCostSum + wholesaleStoredCost,
    "-",
    expenseTotal,
    "=",
    totalSales - storedCostSum - wholesaleStoredCost - expenseTotal
  );
  console.log(
    "Correct formula (lot-based display costs):",
    totalSales,
    "-",
    displayCostSum,
    "-",
    expenseTotal,
    "=",
    totalSales - displayCostSum - expenseTotal
  );
}

main().finally(() => prisma.$disconnect());
