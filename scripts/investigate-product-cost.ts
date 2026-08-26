import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { toNumber, lineRevenueAfterDiscount } from "../src/lib/utils";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: "Chocolate", mode: "insensitive" } },
  });
  if (!product) {
    console.log("Product not found");
    return;
  }

  console.log("Product:", product.name);
  console.log(
    "stock:",
    toNumber(product.currentStock),
    "avgCost:",
    toNumber(product.averageCost),
    "sell:",
    toNumber(product.sellingPrice)
  );

  const purchases = await prisma.purchaseItem.findMany({
    where: { productId: product.id },
    include: { purchase: true },
  });
  console.log("\nPurchases:");
  for (const p of purchases) {
    console.log(
      `  ${p.purchase.purchaseNumber} qty=${toNumber(p.quantity)} unitCost=${toNumber(p.unitCost)} total=${toNumber(p.totalCost)}`
    );
  }

  const sales = await prisma.salesOrderItem.findMany({
    where: { productId: product.id },
    include: { salesOrder: true },
  });
  console.log("\nSales lines:");
  let rev = 0;
  let cost = 0;
  for (const s of sales) {
    const r = lineRevenueAfterDiscount(
      s.totalPrice,
      s.salesOrder.subtotal,
      s.salesOrder.discount
    );
    const c = toNumber(s.totalCost);
    rev += r;
    cost += c;
    console.log(
      `  ${s.salesOrder.orderNumber} qty=${toNumber(s.quantity)} price=${toNumber(s.unitPrice)} rev=${r.toFixed(2)} storedUnitCost=${toNumber(s.unitCost)} storedTotalCost=${c.toFixed(2)}`
    );
  }
  console.log(`\nTotals: revenue=${rev.toFixed(2)} cost=${cost.toFixed(2)} profit=${(rev - cost).toFixed(2)}`);

  const lots = await prisma.productLot.findMany({
    where: { productId: product.id },
  });
  console.log("\nLots:");
  for (const l of lots) {
    console.log(
      `  ${l.lotNumber} init=${toNumber(l.initialQuantity)} remain=${toNumber(l.remainingQuantity)} unitCost=${toNumber(l.unitCost)} source=${l.sourceType}`
    );
  }

  const batches = await prisma.productionBatch.findMany({
    where: { productId: product.id },
  });
  console.log("\nProduction batches:");
  for (const b of batches) {
    console.log(
      `  ${b.batchNumber} output=${toNumber(b.outputQuantity)} costPerUnit=${toNumber(b.costPerUnit)} totalCost=${toNumber(b.totalCost)}`
    );
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(console.error);
