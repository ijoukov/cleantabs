import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const requiredFiles = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png"
];

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
execFileSync("node", ["--check", "popup.js"], { stdio: "inherit" });
execFileSync("node", ["scripts/generate-locales.mjs"], { stdio: "inherit" });

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

if (manifest.name !== "__MSG_appName__" || manifest.description !== "__MSG_appDescription__") {
  throw new Error("Manifest name and description must use localized __MSG_*__ values.");
}

if (manifest.default_locale !== "en") {
  throw new Error("Manifest default_locale must be en.");
}

validateLocales();

console.log("Validation passed.");

function validateLocales() {
  const localeRoot = "_locales";
  if (!existsSync(localeRoot)) {
    throw new Error("Missing _locales directory.");
  }

  const locales = readdirSync(localeRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const expectedLocales = ["de", "en", "es", "es_419", "fr", "hi", "id", "ja", "ko", "pl", "pt_BR", "ru", "tr", "uk", "vi", "zh_CN", "zh_TW"];
  if (locales.join(",") !== expectedLocales.join(",")) {
    throw new Error(`Unexpected locales: ${locales.join(", ")}`);
  }

  const enMessages = JSON.parse(readFileSync("_locales/en/messages.json", "utf8"));
  const enKeys = Object.keys(enMessages).sort();
  for (const locale of locales) {
    const path = `_locales/${locale}/messages.json`;
    const messages = JSON.parse(readFileSync(path, "utf8"));
    const keys = Object.keys(messages).sort();
    if (keys.join(",") !== enKeys.join(",")) {
      throw new Error(`${path} does not match the English message keys.`);
    }
    for (const [key, value] of Object.entries(messages)) {
      if (!value.message || typeof value.message !== "string") {
        throw new Error(`${path} has an invalid message for ${key}.`);
      }
    }
  }
}
