import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Listen on all network interfaces (::)
    host: "::",
    // Development server port
    port: 8080,
    hmr: {
      // Disable the HMR overlay for a cleaner development experience
      overlay: false,
    },
  },
  // Apply React SWC plugin for fast refresh and compilation
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      // Configure '@' as a shortcut for the 'src' directory
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
