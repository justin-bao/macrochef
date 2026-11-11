import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { publicAuthDefines } from "./scripts/public-auth-env";

export default defineConfig(() => ({
  plugins: [
    {
      name: "public-auth-configuration",
      enforce: "post",
      config(config, { mode }) {
        // Run after the managed preview wrapper supplies its public values.
        return { define: publicAuthDefines(loadEnv(mode, process.cwd(), "VITE_SUPABASE_"), config.define) };
      },
    },
    tsConfigPaths(), tailwindcss(), cloudflare({ viteEnvironment: { name: "ssr" } }), tanstackStart(), react(),
  ],
}));
