import Link from "next/link";
import { Pencil } from "lucide-react";
import { cn } from "@/components/ui/cn";

export function EditLink({
  href,
  label = "Edit",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline",
        className
      )}
    >
      <Pencil className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
