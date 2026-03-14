import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const rootDir = fileURLToPath(new URL("./", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
    setupFiles: ["./tests/setupTests.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/node_modules/**", "**/.next/**"],
    },
  },
})
