import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

type DecimalLike = { toNumber(): number };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toNumber(
  value: DecimalLike | number | string | null | undefined
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (typeof value === "object" && "toNumber" in value) return value.toNumber();
  return 0;
}

/** Discount is always a positive amount subtracted from subtotal. */
export function normalizeDiscount(
  value: DecimalLike | number | string | null | undefined
): number {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.abs(n));
}

/** Share order-level discount to a line based on its share of subtotal. */
export function lineRevenueAfterDiscount(
  lineTotalPrice: DecimalLike | number | string,
  orderSubtotal: DecimalLike | number | string | null | undefined,
  orderDiscount: DecimalLike | number | string | null | undefined
): number {
  const linePrice = toNumber(lineTotalPrice);
  const subtotal = toNumber(orderSubtotal);
  const discount = normalizeDiscount(orderDiscount);
  if (subtotal <= 0 || discount <= 0) return linePrice;
  const share = linePrice / subtotal;
  return Math.max(0, linePrice - discount * share);
}

export function formatCurrency(
  amount: DecimalLike | number | string | null | undefined,
  symbol = "Rs."
): string {
  const num = toNumber(amount);
  const formatted = num.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}\u00A0${formatted}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateNumber(
  prefix: string,
  count: number
): Promise<string> {
  const num = String(count + 1).padStart(4, "0");
  return `${prefix}-${num}`;
}

export function calcPaymentStatus(
  total: number,
  paid: number
): "PAID" | "PARTIAL" | "UNPAID" {
  if (paid <= 0) return "UNPAID";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}
