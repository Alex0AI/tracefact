import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  base: "./",
  publicDir: "public",
  build: { outDir: "../web-dist", emptyOutDir: true },
  server: { host: "127.0.0.1", port: 4173 },
});
