import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  syncProductAverageCostFromLots,
  getProductInventoryUnitCost,
} from "../src/lib/inventory";
import { toNumber } from "../src/lib/utils";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, name: true } });

  console.log("=== Sync averageCost from lots ===");
  for (const product of products) {
    const before = await prisma.product.findUnique({
      where: { id: product.id },
      select: { averageCost: true },
    });
    const avg = await syncProductAverageCostFromLots(product.id);
    if (Math.abs(toNumber(before?.averageCost) - avg) > 0.01) {
      console.log(
        `${product.name}: ${toNumber(before?.averageCost)} → ${avg.toFixed(2)}`
      );
    }
  }

  console.log("\n=== Fix inflated order line costs ===");
  const items = await prisma.salesOrderItem.findMany({
    include: { product: true },
  });

  for (const item of items) {
    const qty = toNumber(item.quantity);
    if (qty <= 0) continue;

    const lotUnitCost = await getProductInventoryUnitCost(item.productId);
    const packagingPerUnit = toNumber(item.packagingCost) / qty;
    const expectedUnitCost = lotUnitCost + packagingPerUnit;
    const storedUnitCost = toNumber(item.unitCost);

    // Fix lines where stored cost is more than 2× the lot-based cost
    if (storedUnitCost > expectedUnitCost * 2 && expectedUnitCost > 0) {
      const newTotalCost = expectedUnitCost * qty;
      await prisma.salesOrderItem.update({
        where: { id: item.id },
        data: {
          unitCost: expectedUnitCost,
          totalCost: newTotalCost,
        },
      });
      console.log(
        `${item.product.name}: unitCost ${storedUnitCost.toFixed(2)} → ${expectedUnitCost.toFixed(2)} (qty ${qty})`
      );
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(console.error);
