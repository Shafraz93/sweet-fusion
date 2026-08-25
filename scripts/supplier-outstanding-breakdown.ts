import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { toNumber } from "../src/lib/utils";

async function main() {
  const suppliers = await prisma.supplier.findMany({
    include: { purchases: true },
    orderBy: { name: "asc" },
  });

  let total = 0;
  for (const s of suppliers) {
    let bal = 0;
    for (const p of s.purchases) {
      const due = toNumber(p.totalAmount) - toNumber(p.paidAmount);
      if (Math.abs(due) > 0.001) {
        console.log(
          `${s.name} | ${p.purchaseNumber}: total ${toNumber(p.totalAmount)} - paid ${toNumber(p.paidAmount)} = due ${due.toFixed(2)}`
        );
      }
      bal += due;
    }
    if (Math.abs(bal) > 0.001) {
      console.log(`  → ${s.name} balance: Rs. ${bal.toFixed(2)}\n`);
    }
    total += bal;
  }
  console.log(`Dashboard supplier outstanding: Rs. ${total.toFixed(2)}`);
}

main().finally(() => prisma.$disconnect());
