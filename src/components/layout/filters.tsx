"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";

const DATE_FILTERS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("period") ?? "month";

  return (
    <Select
      options={DATE_FILTERS}
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("period", e.target.value);
        router.push(`?${params.toString()}`);
      }}
      className="w-40"
    />
  );
}

export function SearchInput({
  placeholder = "Search...",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName) ?? "";

  return (
    <input
      type="search"
      placeholder={placeholder}
      defaultValue={value}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) {
          params.set(paramName, e.target.value);
        } else {
          params.delete(paramName);
        }
        router.push(`?${params.toString()}`);
      }}
      className="h-10 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
    />
  );
}
