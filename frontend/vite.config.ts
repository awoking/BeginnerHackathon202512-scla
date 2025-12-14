import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // すでに記述があるはずです
    port: 5173,      // こちらも記述があるかもしれません

    // ↓↓↓ ここを追加してください ↓↓↓
    allowedHosts: [
      'genseki.f5.si',  // あなたのドメイン
      'localhost',
      '127.0.0.1'
    ],
    // ↑↑↑ ここまで ↑↑↑
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
