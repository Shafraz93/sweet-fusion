import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { toNumber } from "../src/lib/utils";

async function main() {
  const customers = await prisma.customer.findMany({
    include: { salesOrders: true, wholesaleSupplies: true },
    orderBy: { name: "asc" },
  });

  let total = 0;
  for (const c of customers) {
    const lines: string[] = [];
    for (const o of c.salesOrders) {
      const due = toNumber(o.totalAmount) - toNumber(o.paidAmount);
      if (Math.abs(due) > 0.001) {
        lines.push(
          `  ${o.orderNumber}: total ${toNumber(o.totalAmount)} - paid ${toNumber(o.paidAmount)} = due ${due}`
        );
      }
    }
    for (const w of c.wholesaleSupplies) {
      const due = toNumber(w.totalAmount) - toNumber(w.paidAmount);
      if (Math.abs(due) > 0.001) {
        lines.push(
          `  ${w.supplyNumber}: total ${toNumber(w.totalAmount)} - paid ${toNumber(w.paidAmount)} = due ${due}`
        );
      }
    }
    const bal =
      c.salesOrders.reduce(
        (s, o) => s + toNumber(o.totalAmount) - toNumber(o.paidAmount),
        0
      ) +
      c.wholesaleSupplies.reduce(
        (s, w) => s + toNumber(w.totalAmount) - toNumber(w.paidAmount),
        0
      );
    if (lines.length > 0 || Math.abs(bal) > 0.001) {
      console.log(`\n${c.name}: outstanding Rs. ${bal.toFixed(2)}`);
      lines.forEach((l) => console.log(l));
    }
    total += bal;
  }
  console.log(`\nDashboard total: Rs. ${total.toFixed(2)}`);
}

main().finally(() => prisma.$disconnect());
