export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `Rs. ${safe.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

const UNIT_LABELS: Record<string, string> = {
  PIECES: "pcs",
  PACKETS: "packets",
  KILOGRAMS: "kg",
  GRAMS: "g",
  BOXES: "boxes",
  BOTTLES: "bottles",
  LITERS: "L",
  MILLILITERS: "ml",
};

export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit.toLowerCase();
}

/** Today's date as YYYY-MM-DD in the device's timezone. */
export function todayISODate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}
