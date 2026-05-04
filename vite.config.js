import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), "index.html"),
        login: resolve(process.cwd(), "login.html"),
        register: resolve(process.cwd(), "register.html"),
      },
    },
  },
});
