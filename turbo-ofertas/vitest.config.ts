import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    // DB integration tests use an isolated database, never the dev DB.
    env: { DATABASE_URL: "file:../data/test.db" },
    globalSetup: ["./tests/global-setup.ts"],
    // SQLite has coarse write locking; serialize test files to avoid lock errors.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
