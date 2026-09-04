/**
 * Read-only check that generated record numbers can't collide with existing
 * ones. Run after changing numbering logic: npx tsx scripts/verify-numbering.ts
 */
import { prisma } from "../src/lib/prisma";
import { peekNextNumber, type SequenceKind } from "../src/lib/numbering";

const CHECKS: Array<{
  kind: SequenceKind;
  label: string;
  load: () => Promise<string[]>;
}> = [
  {
    kind: "lot",
    label: "ProductLot.lotNumber",
    load: async () =>
      (await prisma.productLot.findMany({ select: { lotNumber: true } })).map(
        (r) => r.lotNumber
      ),
  },
  {
    kind: "order",
    label: "SalesOrder.orderNumber",
    load: async () =>
      (await prisma.salesOrder.findMany({ select: { orderNumber: true } })).map(
        (r) => r.orderNumber
      ),
  },
  {
    kind: "purchase",
    label: "Purchase.purchaseNumber",
    load: async () =>
      (
        await prisma.purchase.findMany({ select: { purchaseNumber: true } })
      ).map((r) => r.purchaseNumber),
  },
  {
    kind: "payment",
    label: "Payment.paymentNumber",
    load: async () =>
      (await prisma.payment.findMany({ select: { paymentNumber: true } })).map(
        (r) => r.paymentNumber
      ),
  },
  {
    kind: "batch",
    label: "ProductionBatch.batchNumber",
    load: async () =>
      (
        await prisma.productionBatch.findMany({ select: { batchNumber: true } })
      ).map((r) => r.batchNumber),
  },
  {
    kind: "packaging",
    label: "PackagingOperation.operationNumber",
    load: async () =>
      (
        await prisma.packagingOperation.findMany({
          select: { operationNumber: true },
        })
      ).map((r) => r.operationNumber),
  },
];

function numericSuffix(value: string): number {
  const match = value.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

async function main() {
  let failures = 0;

  for (const check of CHECKS) {
    const existing = await check.load();
    const next = await peekNextNumber(check.kind);
    const taken = new Set(existing);

    const collides = taken.has(next);
    const highest = existing.reduce(
      (max, value) => Math.max(max, numericSuffix(value)),
      0
    );
    const nextValue = numericSuffix(next);
    const isAfterHighest = nextValue > highest;

    const ok = !collides && isAfterHighest;
    if (!ok) failures += 1;

    console.log(
      `[${ok ? "PASS" : "FAIL"}] ${check.label}: ${existing.length} rows, ` +
        `highest #${highest}, next "${next}"` +
        (collides ? "  <-- COLLIDES WITH EXISTING" : "") +
        (!isAfterHighest ? "  <-- NOT AFTER HIGHEST" : "")
    );

    // A count-based sequence would have produced this; show when it differs so
    // the regression this guards against stays visible.
    const countBased = existing.length + 1;
    if (countBased !== nextValue) {
      console.log(
        `        note: old count-based logic would have produced #${countBased}` +
          (taken.has(next.replace(/\d+$/, String(countBased).padStart(4, "0")))
            ? " which already exists (this was the bug)"
            : "")
      );
    }
  }

  console.log(
    failures === 0
      ? "\nAll numbering checks passed."
      : `\n${failures} numbering check(s) failed.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
