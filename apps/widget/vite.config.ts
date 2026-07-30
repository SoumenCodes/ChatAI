import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: "./src/main.tsx",
      name: "AIWidget",
      fileName: () => "widget.js",
      formats: ["iife"],
    },
    rollupOptions: {
      // Ensure everything is bundled into the single IIFE output
      external: [],
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
