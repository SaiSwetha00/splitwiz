import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

function buildClient(): PrismaClient {
  // During next build's "Collecting page data" phase Vercel passes production
  // env vars into the build process. Attempting to initialise the libSQL
  // adapter there fails because the WASM/native client can't bind in that
  // context. Skip it during the build and let Prisma use the SQLite file
  // driver instead (queries are never actually executed at build time).
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (process.env.TURSO_DATABASE_URL && !isBuildPhase) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log: ["error"] });
  }

  return new PrismaClient({
    datasourceUrl: "file:./dev.db",
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
