import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Use different base paths for development and production
  const base = mode === "production" ? "/golf-serie/" : "/";

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      visualizer({
        filename: "bundle-stats.html", // Output file name
        open: true, // Automatically open in browser after build
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3010",
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Force the markdown editor and its heavy dependencies into a separate chunk.
            // This chunk will only be loaded when the Admin section is loaded.
            if (
              id.includes("@uiw/react-md-editor") ||
              id.includes("refractor")
            ) {
              return "markdown-editor";
            }
            // Create a chunk for tanstack libraries
            if (id.includes("@tanstack")) {
              return "vendor-tanstack";
            }
            // Create a chunk for core react libraries
            if (
              id.includes("react-dom") ||
              id.includes("react-router-dom") ||
              id.includes("react")
            ) {
              return "vendor-react";
            }
          },
        },
      },
    },
  };
});
