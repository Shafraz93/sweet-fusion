import { cn } from "@/components/ui/cn";
import { paymentStatusColor } from "@/lib/constants";

export function Badge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    PAID: "Paid",
    PARTIAL: "Partial",
    UNPAID: "Unpaid",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        paymentStatusColor(status)
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function StatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <Badge variant={active ? "success" : "default"}>
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
