import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.STRATA_API_URL?.trim() || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": apiTarget },
  },
  build: { emptyOutDir: false, sourcemap: true },
});
