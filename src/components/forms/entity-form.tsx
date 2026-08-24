"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FormField {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "tel" | "date" | "textarea" | "select" | "hidden" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  step?: string;
  defaultValue?: string | number | boolean;
}

interface EntityFormProps {
  title: string;
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
  successHref?: string;
}

export function EntityForm({
  title,
  fields,
  onSubmit,
  submitLabel = "Save",
  cancelHref,
  successHref,
}: EntityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.type === "checkbox") {
        data[field.name] = formData.get(field.name) === "on" ? "true" : "false";
      } else {
        data[field.name] = formData.get(field.name)?.toString() ?? "";
      }
    });

    startTransition(async () => {
      try {
        await onSubmit(data);
        router.push(successHref ?? cancelHref ?? "/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {fields.map((field) => {
            if (field.type === "hidden") {
              return (
                <input
                  key={field.name}
                  type="hidden"
                  name={field.name}
                  defaultValue={field.defaultValue?.toString()}
                />
              );
            }
            if (field.type === "checkbox") {
              return (
                <div key={field.name} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={field.name}
                    name={field.name}
                    defaultChecked={field.defaultValue === true || field.defaultValue === "true"}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor={field.name} className="text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                </div>
              );
            }
            if (field.type === "textarea") {
              return (
                <Textarea
                  key={field.name}
                  id={field.name}
                  name={field.name}
                  label={field.label}
                  required={field.required}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue?.toString()}
                />
              );
            }
            if (field.type === "select" && field.options) {
              return (
                <Select
                  key={field.name}
                  id={field.name}
                  name={field.name}
                  label={field.label}
                  required={field.required}
                  options={field.options}
                  defaultValue={field.defaultValue?.toString()}
                />
              );
            }
            return (
              <Input
                key={field.name}
                id={field.name}
                name={field.name}
                type={field.type ?? "text"}
                label={field.label}
                required={field.required}
                placeholder={field.placeholder}
                step={field.step}
                defaultValue={field.defaultValue?.toString()}
              />
            );
          })}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : submitLabel}
            </Button>
            {cancelHref && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(cancelHref)}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
