import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The AI modules talk to the Ollama server on this computer. Proxying it keeps
// the browser on one origin, so local models need no CORS setup.
const ollama = {
  "/ollama": {
    target: "http://127.0.0.1:11434",
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/ollama/, ""),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5190, proxy: ollama },
  preview: { port: 5190, proxy: ollama },
});
