import { startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";

export type DatePeriod = "today" | "week" | "month" | "all" | "custom";

export function getDateRange(
  period: string,
  from?: string,
  to?: string
): { start: Date | null; end: Date | null } {
  const now = new Date();
  const end = startOfDay(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case "today":
      return { start: startOfDay(now), end };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end };
    case "month":
      return { start: startOfMonth(now), end };
    case "custom":
      if (from && to) {
        return { start: new Date(from), end: new Date(to) };
      }
      return { start: startOfMonth(now), end };
    case "all":
    default:
      return { start: null, end: null };
  }
}

export function dateFilterWhere(
  period: string,
  field: string,
  from?: string,
  to?: string
) {
  const { start, end } = getDateRange(period, from, to);
  if (!start && !end) return {};
  const range: Record<string, Date> = {};
  if (start) range.gte = start;
  if (end) range.lte = end;
  return { [field]: range };
}

export function getLastNDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => subDays(new Date(), n - 1 - i));
}
