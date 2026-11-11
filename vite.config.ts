import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { publicAuthConfigurationPlugin } from "./scripts/public-auth-env";
import { publicAuthDefaults } from "./scripts/public-auth-defaults";
import { previewServerSecretNames } from "./scripts/preview-server-secrets";

export default defineConfig(({ command }) => ({
  plugins: [
    publicAuthConfigurationPlugin(publicAuthDefaults),
    tsConfigPaths(), tailwindcss(), cloudflare({
      viteEnvironment: { name: "ssr" },
      // With an explicit names-only secrets declaration, Wrangler includes the
      // supervisor's secure environment in local bindings instead of only .env.
      // Production continues to use the platform's deployed secret bindings.
      ...(command === "serve" ? { config: (config) => ({
        secrets: { required: previewServerSecretNames(process.env, config.secrets?.required) },
      }) } : {}),
    }), tanstackStart(), react(),
  ],
}));
