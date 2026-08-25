import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const LOCAL_DATABASE_URL =
  process.env.LOCAL_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

const remoteUrl =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!remoteUrl) {
  throw new Error(
    "Set DIRECT_DATABASE_URL (or DATABASE_URL) in .env to your Supabase direct connection."
  );
}

const REMOTE_DATABASE_URL = remoteUrl;

function createPrisma(url: string): { prisma: PrismaClient; pool: Pool } {
  const needsSsl = url.includes("supabase.com");
  const pool = new Pool({
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return { prisma, pool };
}

async function pushSchemaToRemote() {
  console.log("Pushing schema to Supabase...");
  const { execSync } = await import("node:child_process");
  execSync("npx prisma db push --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: REMOTE_DATABASE_URL },
  });
}

async function clearRemote(remote: PrismaClient) {
  console.log("Clearing remote data...");
  await remote.$executeRawUnsafe(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE '_prisma%'
      ) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
}

async function copyData(local: PrismaClient, remote: PrismaClient) {
  console.log("Copying data from local → Supabase...");

  const copy = async <T>(
    label: string,
    load: () => Promise<T[]>,
    save: (rows: T[]) => Promise<{ count: number }>
  ) => {
    const rows = await load();
    if (rows.length === 0) {
      console.log(`  ${label}: 0 rows (skipped)`);
      return;
    }
    const result = await save(rows);
    console.log(`  ${label}: ${result.count} rows`);
  };

  await copy(
    "AppSettings",
    () => local.appSettings.findMany(),
    (rows) => remote.appSettings.createMany({ data: rows })
  );
  await copy(
    "ProductCategory",
    () => local.productCategory.findMany(),
    (rows) => remote.productCategory.createMany({ data: rows })
  );
  await copy(
    "Supplier",
    () => local.supplier.findMany(),
    (rows) => remote.supplier.createMany({ data: rows })
  );
  await copy(
    "Customer",
    () => local.customer.findMany(),
    (rows) => remote.customer.createMany({ data: rows })
  );
  await copy(
    "RawMaterial",
    () => local.rawMaterial.findMany(),
    (rows) => remote.rawMaterial.createMany({ data: rows })
  );
  await copy(
    "PackagingMaterial",
    () => local.packagingMaterial.findMany(),
    (rows) => remote.packagingMaterial.createMany({ data: rows })
  );
  await copy(
    "Product",
    () => local.product.findMany(),
    (rows) => remote.product.createMany({ data: rows })
  );
  await copy(
    "Recipe",
    () => local.recipe.findMany(),
    (rows) => remote.recipe.createMany({ data: rows })
  );
  await copy(
    "RecipeIngredient",
    () => local.recipeIngredient.findMany(),
    (rows) => remote.recipeIngredient.createMany({ data: rows })
  );
  await copy(
    "Purchase",
    () => local.purchase.findMany(),
    (rows) => remote.purchase.createMany({ data: rows })
  );
  await copy(
    "PurchaseItem",
    () => local.purchaseItem.findMany(),
    (rows) => remote.purchaseItem.createMany({ data: rows })
  );
  await copy(
    "ProductionBatch",
    () => local.productionBatch.findMany(),
    (rows) => remote.productionBatch.createMany({ data: rows })
  );
  await copy(
    "ProductionBatchIngredient",
    () => local.productionBatchIngredient.findMany(),
    (rows) => remote.productionBatchIngredient.createMany({ data: rows })
  );
  await copy(
    "PackagingOperation",
    () => local.packagingOperation.findMany(),
    (rows) => remote.packagingOperation.createMany({ data: rows })
  );
  await copy(
    "PackagingOperationMaterial",
    () => local.packagingOperationMaterial.findMany(),
    (rows) => remote.packagingOperationMaterial.createMany({ data: rows })
  );
  await copy(
    "ProductLot",
    () => local.productLot.findMany(),
    (rows) => remote.productLot.createMany({ data: rows })
  );
  await copy(
    "InventoryMovement",
    () => local.inventoryMovement.findMany(),
    (rows) => remote.inventoryMovement.createMany({ data: rows })
  );
  await copy(
    "SalesOrder",
    () => local.salesOrder.findMany(),
    (rows) => remote.salesOrder.createMany({ data: rows })
  );
  await copy(
    "SalesOrderItem",
    () => local.salesOrderItem.findMany(),
    (rows) => remote.salesOrderItem.createMany({ data: rows })
  );
  await copy(
    "SalesOrderItemPackaging",
    () => local.salesOrderItemPackaging.findMany(),
    (rows) => remote.salesOrderItemPackaging.createMany({ data: rows })
  );
  await copy(
    "WholesaleSupply",
    () => local.wholesaleSupply.findMany(),
    (rows) => remote.wholesaleSupply.createMany({ data: rows })
  );
  await copy(
    "WholesaleSupplyItem",
    () => local.wholesaleSupplyItem.findMany(),
    (rows) => remote.wholesaleSupplyItem.createMany({ data: rows })
  );
  await copy(
    "Payment",
    () => local.payment.findMany(),
    (rows) => remote.payment.createMany({ data: rows })
  );
  await copy(
    "Expense",
    () => local.expense.findMany(),
    (rows) => remote.expense.createMany({ data: rows })
  );
}

async function main() {
  console.log("Local DB:", LOCAL_DATABASE_URL.replace(/:[^:@]+@/, ":****@"));
  console.log(
    "Remote DB:",
    REMOTE_DATABASE_URL.replace(/:[^:@]+@/, ":****@")
  );

  await pushSchemaToRemote();

  const localConn = createPrisma(LOCAL_DATABASE_URL);
  const remoteConn = createPrisma(REMOTE_DATABASE_URL);

  try {
    await clearRemote(remoteConn.prisma);
    await copyData(localConn.prisma, remoteConn.prisma);
    console.log("\nDone! Refresh your Vercel site.");
  } finally {
    await localConn.prisma.$disconnect();
    await remoteConn.prisma.$disconnect();
    await localConn.pool.end();
    await remoteConn.pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
