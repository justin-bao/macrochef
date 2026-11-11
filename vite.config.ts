import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { publicAuthConfigurationPlugin } from "./scripts/public-auth-env";
import { publicAuthDefaults } from "./scripts/public-auth-defaults";

export default defineConfig(() => ({
  plugins: [
    publicAuthConfigurationPlugin(publicAuthDefaults),
    tsConfigPaths(), tailwindcss(), cloudflare({ viteEnvironment: { name: "ssr" } }), tanstackStart(), react(),
  ],
}));
