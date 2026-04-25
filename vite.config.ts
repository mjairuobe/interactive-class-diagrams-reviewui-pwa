import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fullReload from "vite-plugin-full-reload";
import { VitePWA } from "vite-plugin-pwa";

const DEFAULT_DEV_PORT = 40889;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "");
  const port = Number(
    env.PORT ?? process.env.PORT ?? String(DEFAULT_DEV_PORT),
  );
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT: "${env.PORT ?? process.env.PORT}"`);
  }

  const basePath = env.BASE_PATH ?? process.env.BASE_PATH ?? "/";

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      // Vollständiger Reload bei z. B. index.html; TS/TSX nutzt HMR (Fast Refresh).
      fullReload(["index.html"]),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true, // Erlaubt die Installation der PWA unter localhost im Dev-Modus
          type: 'module',
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'Interactive Class Diagrams',
          short_name: 'Diagrams',
          description: 'A mobile-first PWA for reviewing UML Class Diagrams',
          theme_color: '#0f172a', // slate-900
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait-primary',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "127.0.0.1",
    },
    preview: {
      port,
      host: "127.0.0.1",
    },
  };
});
