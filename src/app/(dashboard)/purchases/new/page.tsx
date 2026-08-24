import { getSuppliers } from "@/lib/actions/suppliers";
import { getProducts } from "@/lib/actions/products";
import { getRawMaterials } from "@/lib/actions/raw-materials";
import { getPackagingMaterials } from "@/lib/actions/packaging-materials";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { PageHeader } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const [suppliers, products, rawMaterials, packagingMaterials] =
    await Promise.all([
      getSuppliers(),
      getProducts(),
      getRawMaterials(),
      getPackagingMaterials(),
    ]);

  return (
    <>
      <PageHeader
        title="Record Purchase"
        description="Add a new purchase from a supplier"
      />
      <PurchaseForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
        }))}
        rawMaterials={rawMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
        }))}
        packagingMaterials={packagingMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
        }))}
      />
    </>
  );
}
