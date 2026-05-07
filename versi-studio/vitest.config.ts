import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // s33 Lot D : timeout 30s (default 5s) — cold-start CI/local lourd
    // (sharp + pg + pdf-to-img + tesseract.js = ~10s import cold).
    // Hot run reste à ~1-2s. Fix bug s33 commit 1da2d78 : test
    // pdf-vector-parser timeout silencieux poussé sur main.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
