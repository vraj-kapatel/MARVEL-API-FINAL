#!/usr/bin/env node

import { spawn } from "node:child_process";
import { platform } from "node:os";
import { createServer } from "vite";

const server = await createServer({
  root: process.cwd(),
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});

await server.listen();
server.printUrls();

const localUrl = server.resolvedUrls?.local?.[0] ?? "http://127.0.0.1:5173/";
const indexUrl = new URL("/index.html", localUrl).toString();

openChrome(indexUrl);

function openChrome(url) {
  const currentPlatform = platform();

  if (currentPlatform === "darwin") {
    spawn("open", ["-a", "Google Chrome", url], {
      detached: true,
      stdio: "ignore",
    }).unref();
    return;
  }

  if (currentPlatform === "win32") {
    spawn("cmd", ["/c", "start", "", "chrome", url], {
      detached: true,
      stdio: "ignore",
    }).unref();
    return;
  }

  const chromeCommands = [
    process.env.CHROME_BIN,
    "google-chrome",
    "google-chrome-stable",
    "chromium-browser",
    "chromium",
  ].filter(Boolean);

  const child = spawn(chromeCommands[0], [url], {
    detached: true,
    stdio: "ignore",
  });

  child.on("error", () => {
    for (const command of chromeCommands.slice(1)) {
      const fallback = spawn(command, [url], {
        detached: true,
        stdio: "ignore",
      });

      fallback.on("error", () => {});
      fallback.unref();
      return;
    }

    console.error(`Chrome was not found. Open ${url} manually.`);
  });

  child.unref();
}
