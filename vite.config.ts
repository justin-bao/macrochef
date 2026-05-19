import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => ({
  plugins: [tsConfigPaths(), tailwindcss(), tanstackStart(), nitro({ preset: "vercel", serverDir: "server" }), react()],
}));
