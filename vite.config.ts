import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    tailwindcss(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
}));
