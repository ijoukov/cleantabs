import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const version = manifest.version;
const outputPath = `dist/cleantabs-${version}.zip`;
const files = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png",
  ...localeFiles()
];

mkdirSync("dist", { recursive: true });
writeFileSync(outputPath, createZip(files));
console.log(`Wrote ${outputPath}`);

function localeFiles() {
  return readdirSync("_locales", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `_locales/${entry.name}/messages.json`)
    .sort();
}

function createZip(paths) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const path of paths) {
    const name = Buffer.from(path, "utf8");
    const data = readFileSync(path);
    const compressed = deflateRawSync(data);
    const crc = crc32(data);

    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(8),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(compressed.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      name
    ]);

    localParts.push(localHeader, compressed);

    const centralHeader = Buffer.concat([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(8),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(compressed.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      name
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(paths.length),
    uint16(paths.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0)
  ]);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
