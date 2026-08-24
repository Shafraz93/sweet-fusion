import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  ProductType,
  UnitOfMeasure,
  CustomerType,
  PurchaseItemType,
  ExpenseCategory,
} from "../src/generated/prisma";

async function main() {
  console.log("Seeding Sweet Fusion database...");

  const existingSettings = await prisma.appSettings.findFirst();
  if (!existingSettings) {
    await prisma.appSettings.create({
      data: {
        companyName: "Sweet Fusion",
        currency: "LKR",
        currencySymbol: "Rs.",
        allowNegativeInventory: false,
      },
    });
  }

  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { name: "Traditional Sweets" },
      update: {},
      create: { name: "Traditional Sweets", description: "Local traditional sweet products" },
    }),
    prisma.productCategory.upsert({
      where: { name: "Confectionery" },
      update: {},
      create: { name: "Confectionery", description: "Candies and jujubes" },
    }),
    prisma.productCategory.upsert({
      where: { name: "Food Products" },
      update: {},
      create: { name: "Food Products", description: "Other food items" },
    }),
  ]);

  const supplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    update: {},
    create: {
      id: "seed-supplier-1",
      name: "Colombo Dodol Suppliers",
      contactPerson: "Mr. Silva",
      phone: "+94 77 123 4567",
      whatsapp: "+94 77 123 4567",
      address: "123 Galle Road, Colombo",
    },
  });

  const ingredientSupplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-2" },
    update: {},
    create: {
      id: "seed-supplier-2",
      name: "Bulk Ingredients Lanka",
      contactPerson: "Mrs. Perera",
      phone: "+94 71 987 6543",
      address: "45 Industrial Zone, Kelaniya",
    },
  });

  const dodol = await prisma.product.upsert({
    where: { sku: "SF-DODOL-001" },
    update: {},
    create: {
      name: "Dodol",
      sku: "SF-DODOL-001",
      categoryId: categories[0].id,
      type: ProductType.PURCHASED,
      unit: UnitOfMeasure.KILOGRAMS,
      sellingPrice: 1200,
      wholesalePrice: 950,
      minStockLevel: 5,
      description: "Premium dodol purchased from supplier, repackaged with Sweet Fusion branding",
    },
  });

  const gulabJamun = await prisma.product.upsert({
    where: { sku: "SF-GJ-001" },
    update: {},
    create: {
      name: "Gulab Jamun",
      sku: "SF-GJ-001",
      categoryId: categories[0].id,
      type: ProductType.MANUFACTURED,
      unit: UnitOfMeasure.PIECES,
      sellingPrice: 25,
      wholesalePrice: 18,
      minStockLevel: 100,
      description: "Homemade gulab jamun produced by Sweet Fusion",
    },
  });

  const jujubes = await prisma.product.upsert({
    where: { sku: "SF-JUJ-001" },
    update: {},
    create: {
      name: "Jujubes",
      sku: "SF-JUJ-001",
      categoryId: categories[1].id,
      type: ProductType.PURCHASED,
      unit: UnitOfMeasure.PACKETS,
      sellingPrice: 150,
      wholesalePrice: 120,
      minStockLevel: 20,
    },
  });

  const sugar = await prisma.rawMaterial.upsert({
    where: { name: "Sugar" },
    update: {},
    create: {
      name: "Sugar",
      category: "Sweeteners",
      unit: UnitOfMeasure.KILOGRAMS,
      currentStock: 50,
      minStockLevel: 10,
      averageCost: 180,
    },
  });

  const flour = await prisma.rawMaterial.upsert({
    where: { name: "Flour" },
    update: {},
    create: {
      name: "Flour",
      category: "Dry Goods",
      unit: UnitOfMeasure.KILOGRAMS,
      currentStock: 30,
      minStockLevel: 5,
      averageCost: 120,
    },
  });

  const milkPowder = await prisma.rawMaterial.upsert({
    where: { name: "Milk Powder" },
    update: {},
    create: {
      name: "Milk Powder",
      category: "Dairy",
      unit: UnitOfMeasure.KILOGRAMS,
      currentStock: 10,
      minStockLevel: 2,
      averageCost: 2500,
    },
  });

  const ghee = await prisma.rawMaterial.upsert({
    where: { name: "Ghee" },
    update: {},
    create: {
      name: "Ghee",
      category: "Fats",
      unit: UnitOfMeasure.KILOGRAMS,
      currentStock: 5,
      minStockLevel: 1,
      averageCost: 3200,
    },
  });

  const container = await prisma.packagingMaterial.upsert({
    where: { name: "Plastic Container 500g" },
    update: {},
    create: {
      name: "Plastic Container 500g",
      unit: UnitOfMeasure.PIECES,
      currentStock: 200,
      minStockLevel: 50,
      averageCost: 20,
    },
  });

  const label = await prisma.packagingMaterial.upsert({
    where: { name: "Sweet Fusion Label" },
    update: {},
    create: {
      name: "Sweet Fusion Label",
      unit: UnitOfMeasure.PIECES,
      currentStock: 500,
      minStockLevel: 100,
      averageCost: 3,
    },
  });

  const sticker = await prisma.packagingMaterial.upsert({
    where: { name: "Brand Sticker" },
    update: {},
    create: {
      name: "Brand Sticker",
      unit: UnitOfMeasure.PIECES,
      currentStock: 500,
      minStockLevel: 100,
      averageCost: 5,
    },
  });

  const recipe = await prisma.recipe.upsert({
    where: { id: "seed-recipe-gj" },
    update: {},
    create: {
      id: "seed-recipe-gj",
      name: "Gulab Jamun Standard Recipe",
      productId: gulabJamun.id,
      expectedOutputQty: 100,
      outputUnit: UnitOfMeasure.PIECES,
      notes: "Standard batch for 100 pieces",
      ingredients: {
        create: [
          { rawMaterialId: milkPowder.id, quantity: 2, unit: UnitOfMeasure.KILOGRAMS },
          { rawMaterialId: flour.id, quantity: 1, unit: UnitOfMeasure.KILOGRAMS },
          { rawMaterialId: sugar.id, quantity: 3, unit: UnitOfMeasure.KILOGRAMS },
          { rawMaterialId: ghee.id, quantity: 0.5, unit: UnitOfMeasure.KILOGRAMS },
        ],
      },
    },
  });

  const retailCustomer = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      name: "Kamal Perera",
      phone: "+94 77 555 1234",
      type: CustomerType.RETAIL,
      address: "Colombo 05",
    },
  });

  const shopCustomer = await prisma.customer.upsert({
    where: { id: "seed-customer-2" },
    update: {},
    create: {
      id: "seed-customer-2",
      name: "Sweet Corner Shop",
      phone: "+94 71 444 5678",
      type: CustomerType.SHOP,
      address: "Kandy Road, Kaduwela",
    },
  });

  // Sample purchase of Dodol
  const purchase = await prisma.purchase.create({
    data: {
      purchaseNumber: "PUR-0001",
      supplierId: supplier.id,
      purchaseDate: new Date(),
      invoiceRef: "INV-2024-001",
      totalAmount: 8000,
      paidAmount: 8000,
      paymentStatus: "PAID",
      items: {
        create: [
          {
            itemType: PurchaseItemType.FINISHED_PRODUCT,
            productId: dodol.id,
            quantity: 10,
            unit: UnitOfMeasure.KILOGRAMS,
            unitCost: 800,
            totalCost: 8000,
          },
        ],
      },
    },
    include: { items: true },
  });

  await prisma.product.update({
    where: { id: dodol.id },
    data: { currentStock: 10, averageCost: 800 },
  });

  await prisma.productLot.create({
    data: {
      lotNumber: "LOT-0001",
      productId: dodol.id,
      sourceType: "PURCHASE",
      purchaseItemId: purchase.items[0].id,
      initialQuantity: 10,
      remainingQuantity: 10,
      unit: UnitOfMeasure.KILOGRAMS,
      purchaseCost: 800,
      unitCost: 800,
    },
  });

  await prisma.inventoryMovement.create({
    data: {
      itemType: "FINISHED_PRODUCT",
      itemId: dodol.id,
      itemName: "Dodol",
      movementType: "PURCHASE",
      quantity: 10,
      unit: UnitOfMeasure.KILOGRAMS,
      unitCost: 800,
      totalCost: 8000,
      referenceType: "Purchase",
      referenceId: purchase.id,
    },
  });

  await prisma.expense.createMany({
    data: [
      {
        category: ExpenseCategory.FACEBOOK_ADS,
        amount: 5000,
        description: "Facebook ad campaign - August",
        expenseDate: new Date(),
      },
      {
        category: ExpenseCategory.TRANSPORT,
        amount: 2500,
        description: "Delivery to shops",
        expenseDate: new Date(),
      },
      {
        category: ExpenseCategory.RENT,
        amount: 25000,
        description: "Monthly shop rent",
        expenseDate: new Date(),
      },
    ],
  });

  console.log("Seed completed successfully!");
  console.log(`  Products: Dodol, Gulab Jamun, Jujubes`);
  console.log(`  Raw materials: Sugar, Flour, Milk Powder, Ghee`);
  console.log(`  Recipe: ${recipe.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
