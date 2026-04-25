import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const requiredFiles = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "service_worker.js",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png"
];

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
execFileSync("node", ["--check", "popup.js"], { stdio: "inherit" });
execFileSync("node", ["--check", "service_worker.js"], { stdio: "inherit" });

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

for (const iconPath of Object.values(manifest.icons || {})) {
  if (!existsSync(iconPath)) {
    throw new Error(`Manifest references missing icon: ${iconPath}`);
  }
}

for (const iconPath of Object.values(manifest.action?.default_icon || {})) {
  if (!existsSync(iconPath)) {
    throw new Error(`Action references missing icon: ${iconPath}`);
  }
}

console.log("Validation passed.");
