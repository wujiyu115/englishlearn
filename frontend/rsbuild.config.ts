// frontend/rsbuild.config.ts
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  server: { port: 3000, proxy: { "/api": "http://localhost:8000" } },
  source: { entry: { index: "./src/main.tsx" } },
  html: { template: "./index.html" },
});
