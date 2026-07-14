import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrismaClient(): PrismaClient {
  // During next build's "Collecting page data" phase Vercel passes production
  // env vars into the build process. Attempting to initialise the libSQL
  // adapter there fails because the WASM/native client can't bind in that
  // context. Skip it during the build and let Prisma use the SQLite file
  // driver instead (queries are never actually executed at build time).
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build";

  if (process.env.TURSO_DATABASE_URL && !isBuildPhase) {
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter: adapter as any, log: ["error"] });
  }

  // Local dev or build phase: use the SQLite file driver.
  // Explicitly supply a safe file URL so a leftover libsql:// DATABASE_URL
  // in the environment can never be passed to the default driver.
  return new PrismaClient({
    datasourceUrl: "file:./dev.db",
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Reuse a single PrismaClient across hot-reloads in dev.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
