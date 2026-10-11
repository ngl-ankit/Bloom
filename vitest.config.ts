import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "postgres://bloom:bloom_local@localhost:5432/bloom",
      SESSION_SECRET: "test-secret-value-0123456789",
    },
    include: ["tests/**/*.test.ts"],
  },
});
