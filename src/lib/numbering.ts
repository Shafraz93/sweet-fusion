import { prisma } from "@/lib/prisma";

/**
 * Human-readable record numbers (LOT-0001, ORD-0002, ...).
 *
 * Numbers are derived from the highest number already stored rather than a row
 * count, because a count goes stale as soon as a row is deleted and produces a
 * number that already exists. Creates are also retried on a unique-constraint
 * violation so two clients (web and mobile) can insert at the same time.
 */

const SEQUENCES = {
  lot: { prefix: "LOT", table: "ProductLot", column: "lotNumber" },
  order: { prefix: "ORD", table: "SalesOrder", column: "orderNumber" },
  purchase: { prefix: "PUR", table: "Purchase", column: "purchaseNumber" },
  payment: { prefix: "PAY", table: "Payment", column: "paymentNumber" },
  batch: { prefix: "BATCH", table: "ProductionBatch", column: "batchNumber" },
  packaging: {
    prefix: "PKG",
    table: "PackagingOperation",
    column: "operationNumber",
  },
} as const;

export type SequenceKind = keyof typeof SEQUENCES;

const MAX_ATTEMPTS = 5;

function formatNumber(prefix: string, value: number): string {
  return `${prefix}-${String(value).padStart(4, "0")}`;
}

/**
 * Highest numeric suffix in use. Compared as a number, not a string, so the
 * sequence stays correct past 9999 where zero-padded text sorting breaks down.
 */
async function highestSequence(kind: SequenceKind): Promise<number> {
  const { table, column } = SEQUENCES[kind];
  const rows = await prisma.$queryRawUnsafe<{ max: number | bigint | string | null }[]>(
    `SELECT MAX((substring("${column}" from '[0-9]+$'))::bigint) AS max FROM "${table}"`
  );
  const max = rows[0]?.max;
  if (max === null || max === undefined) return 0;
  const parsed = Number(max);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDuplicateNumberError(error: unknown, column: string): boolean {
  const candidate = error as {
    code?: string;
    meta?: { target?: unknown };
    message?: string;
  };
  if (candidate?.code !== "P2002") return false;

  const target = candidate.meta?.target;
  const targetText = Array.isArray(target)
    ? target.join(",")
    : typeof target === "string"
      ? target
      : "";
  const haystack = (targetText || candidate.message || "").toLowerCase();
  return haystack.includes(column.toLowerCase());
}

/**
 * Runs `create` with the next free number, retrying with the following number
 * if another request claimed it first.
 */
export async function withSequentialNumber<T>(
  kind: SequenceKind,
  create: (recordNumber: string) => Promise<T>
): Promise<T> {
  const { prefix, column } = SEQUENCES[kind];
  let next = (await highestSequence(kind)) + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await create(formatNumber(prefix, next));
    } catch (error) {
      if (!isDuplicateNumberError(error, column)) throw error;
      lastError = error;
      next += 1;
    }
  }

  throw lastError;
}

/** Next free number without creating anything. Prefer `withSequentialNumber`. */
export async function peekNextNumber(kind: SequenceKind): Promise<string> {
  const { prefix } = SEQUENCES[kind];
  return formatNumber(prefix, (await highestSequence(kind)) + 1);
}
