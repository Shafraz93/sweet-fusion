import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  prismaClientVersion?: number;
};

/** Bump when schema/client shape changes so dev hot-reload picks up a fresh client. */
const PRISMA_CLIENT_VERSION = 2;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("prisma+postgres://")) {
    try {
      const parsed = new URL(url);
      const apiKey = parsed.searchParams.get("api_key");
      if (apiKey) {
        const decoded = JSON.parse(
          Buffer.from(apiKey, "base64").toString("utf-8")
        ) as { databaseUrl?: string };
        if (decoded.databaseUrl) return decoded.databaseUrl;
      }
    } catch {
      // fall through to raw URL
    }
  }
  return url;
}

function createPool(): Pool {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const needsSsl =
    process.env.NODE_ENV === "production" ||
    connectionString.includes("supabase.com");

  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 1 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: false,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  pool.on("error", (err) => {
    console.error("[db] Unexpected pool error:", err.message);
  });

  return pool;
}

function createPrismaClient() {
  const pool = globalForPrisma.pool ?? createPool();
  if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (
    process.env.NODE_ENV !== "production" &&
    globalForPrisma.prismaClientVersion !== PRISMA_CLIENT_VERSION
  ) {
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaClientVersion = PRISMA_CLIENT_VERSION;
  }

  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

/** Lazy client — avoids crashing at import when DATABASE_URL is missing. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

/** Reset pool/client after connection failures (dev hot-reload recovery). */
export async function resetDatabaseConnection() {
  if (globalForPrisma.pool) {
    await globalForPrisma.pool.end().catch(() => undefined);
    globalForPrisma.pool = undefined;
  }
  globalForPrisma.prisma = undefined;
}

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("database_url environment variable is not set") ||
    msg.includes("connection terminated") ||
    msg.includes("connection refused") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("can't reach database") ||
    msg.includes("server has closed the connection") ||
    msg.includes("password authentication failed") ||
    msg.includes("self-signed certificate") ||
    msg.includes("does not exist")
  );
}
