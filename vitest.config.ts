import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // 目前全部为纯逻辑 .test.ts；.tsx（组件/hook）测试需先引入 jsdom/happy-dom 再扩 glob
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
