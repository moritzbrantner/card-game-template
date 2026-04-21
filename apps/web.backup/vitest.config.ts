import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@moritzbrantner/ui": path.resolve(__dirname, "../web/packages/ui/src/index.ts"),
      "@moritzbrantner/storytelling": path.resolve(__dirname, "../web/packages/storytelling/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./tests/vitest.setup.ts"],
  },
});
