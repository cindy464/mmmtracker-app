import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// StackBlitz/Bolt run this in a real bundler (unlike the Figma preview sandbox),
// so the "@/..." import alias used for asset imports has to be wired up for real.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
