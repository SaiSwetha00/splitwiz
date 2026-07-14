import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client and the Prisma libSQL adapter use native/WASM bindings
  // that cannot be bundled by Next.js — load them as-is from node_modules.
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
};

export default nextConfig;
