import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// User page (hunteredward98.github.io) served at root → base "/".
export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
