import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { toNumber } from "../src/lib/utils";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  for (const num of ["ORD-0008", "ORD-0012"]) {
    const order = await prisma.salesOrder.findFirst({
      where: { orderNumber: num },
      include: {
        items: {
          include: {
            product: true,
            packaging: { include: { packagingMaterial: true } },
          },
        },
      },
    });
    if (!order) continue;
    console.log("\n" + num);
    for (const item of order.items) {
      console.log(" product:", item.product.name);
      console.log(" qty:", toNumber(item.quantity), "unitPrice:", toNumber(item.unitPrice));
      console.log(" stored unitCost:", toNumber(item.unitCost), "packagingCost:", toNumber(item.packagingCost), "totalCost:", toNumber(item.totalCost));
      for (const pkg of item.packaging) {
        console.log("  packaging:", pkg.packagingMaterial.name, "qty:", toNumber(pkg.quantityUsed), "cost:", toNumber(pkg.totalCost));
      }
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(console.error);
