/** Mirrors the web app's Tailwind palette so both surfaces look related. */
export const colors = {
  primary: "#e11d48",
  primaryDark: "#be123c",
  primarySoft: "#fff1f2",
  background: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  success: "#047857",
  successSoft: "#ecfdf5",
  warning: "#b45309",
  warningSoft: "#fffbeb",
  danger: "#b91c1c",
  dangerSoft: "#fef2f2",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

export const paymentStatusStyle: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  PAID: { bg: colors.successSoft, fg: colors.success, label: "Paid" },
  PARTIAL: { bg: colors.warningSoft, fg: colors.warning, label: "Partial" },
  UNPAID: { bg: colors.dangerSoft, fg: colors.danger, label: "Unpaid" },
};
