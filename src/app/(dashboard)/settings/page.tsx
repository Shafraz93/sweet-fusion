import { getSettings, updateSettingsFromForm } from "@/lib/actions/settings";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your Sweet Fusion application"
      />
      <EntityForm
        title="Application Settings"
        cancelHref="/"
        submitLabel="Save Settings"
        fields={[
          {
            name: "companyName",
            label: "Company Name",
            defaultValue: settings.companyName ?? "",
          },
          {
            name: "currency",
            label: "Currency Code",
            defaultValue: settings.currency ?? "LKR",
          },
          {
            name: "currencySymbol",
            label: "Currency Symbol",
            defaultValue: settings.currencySymbol ?? "Rs.",
          },
          {
            name: "allowNegativeInventory",
            label: "Allow Negative Inventory",
            type: "select",
            options: [
              { value: "false", label: "No — block overselling" },
              { value: "true", label: "Yes — allow negative stock" },
            ],
            defaultValue: settings.allowNegativeInventory ? "true" : "false",
          },
        ]}
        onSubmit={updateSettingsFromForm}
      />
    </>
  );
}
