import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { toNumber, lineRevenueAfterDiscount, normalizeDiscount } from "../src/lib/utils";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const sales = await prisma.salesOrderItem.findMany({
    include: {
      salesOrder: {
        select: {
          orderNumber: true,
          subtotal: true,
          discount: true,
          totalAmount: true,
        },
      },
      product: { select: { id: true, name: true } },
    },
  });

  const byProduct = new Map<
    string,
    {
      name: string;
      soldQty: number;
      soldRevenue: number;
      soldCost: number;
      soldProfit: number;
    }
  >();

  for (const item of sales) {
    const revenue = lineRevenueAfterDiscount(
      item.totalPrice,
      item.salesOrder.subtotal,
      item.salesOrder.discount
    );
    const cost = toNumber(item.totalCost);
    const existing = byProduct.get(item.productId) ?? {
      name: item.product.name,
      soldQty: 0,
      soldRevenue: 0,
      soldCost: 0,
      soldProfit: 0,
    };
    existing.soldQty += toNumber(item.quantity);
    existing.soldRevenue += revenue;
    existing.soldCost += cost;
    existing.soldProfit = existing.soldRevenue - existing.soldCost;
    byProduct.set(item.productId, existing);
  }

  console.log("=== PRODUCT PROFIT (after discount) ===\n");
  for (const [, p] of byProduct) {
    const margin = p.soldRevenue > 0 ? (p.soldProfit / p.soldRevenue) * 100 : 0;
    console.log(
      `${p.name}: profit Rs.${p.soldProfit.toFixed(2)} | revenue Rs.${p.soldRevenue.toFixed(2)} | cost Rs.${p.soldCost.toFixed(2)} | margin ${margin.toFixed(1)}%`
    );
  }

  const target = [...byProduct.values()].find(
    (p) => Math.abs(p.soldProfit - 3495.56) < 1
  );
  if (target) {
    console.log(`\n=== LINE BREAKDOWN: ${target.name} ===\n`);
    const items = sales.filter((s) => s.product.name === target.name);
    for (const item of items) {
      const linePrice = toNumber(item.totalPrice);
      const afterDisc = lineRevenueAfterDiscount(
        item.totalPrice,
        item.salesOrder.subtotal,
        item.salesOrder.discount
      );
      const lineCost = toNumber(item.totalCost);
      console.log(
        `${item.salesOrder.orderNumber}: qty=${toNumber(item.quantity)} line=${linePrice} afterDisc=${afterDisc.toFixed(2)} cost=${lineCost.toFixed(2)} profit=${(afterDisc - lineCost).toFixed(2)} (order disc=${normalizeDiscount(item.salesOrder.discount)}, subtotal=${toNumber(item.salesOrder.subtotal)})`
      );
    }
    console.log(
      `\nCheck: revenue ${target.soldRevenue.toFixed(2)} - cost ${target.soldCost.toFixed(2)} = profit ${target.soldProfit.toFixed(2)}`
    );
    console.log(
      `Margin: ${target.soldProfit.toFixed(2)} / ${target.soldRevenue.toFixed(2)} = ${((target.soldProfit / target.soldRevenue) * 100).toFixed(1)}%`
    );
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(console.error);
