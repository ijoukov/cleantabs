import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const sizes = [16, 32, 48, 128];
mkdirSync("icons", { recursive: true });

for (const size of sizes) {
  writeFileSync(`icons/icon${size}.png`, makeIcon(size));
}

function makeIcon(size) {
  const width = size;
  const height = size;
  const pixels = Buffer.alloc(width * height * 4);
  const padding = Math.round(size * 0.125);
  const logoSize = size - padding * 2;
  const logoBox = { left: padding, top: padding, size: logoSize };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (isRoundedLogoOutside(x, y, logoBox)) {
        pixels[i + 3] = 0;
        continue;
      }

      pixels[i] = 15;
      pixels[i + 1] = 118;
      pixels[i + 2] = 110;
      pixels[i + 3] = 255;
    }
  }

  drawTab(pixels, size, logoBox, 0.18, 0.26, 0.58, 0.46, [226, 244, 242, 255]);
  drawTab(pixels, size, logoBox, 0.28, 0.39, 0.58, 0.46, [255, 255, 255, 255]);
  drawStripe(pixels, size, logoBox, 0.38, 0.54, 0.36, [15, 118, 110, 255]);
  drawStripe(pixels, size, logoBox, 0.38, 0.66, 0.26, [15, 118, 110, 255]);

  return encodePng(width, height, pixels);
}

function isRoundedLogoOutside(x, y, box) {
  const radius = box.size * 0.18;
  return (
    x < box.left ||
    y < box.top ||
    x >= box.left + box.size ||
    y >= box.top + box.size ||
    isRoundedRectOutside(x, y, box.left, box.top, box.size, box.size, radius)
  );
}

function drawTab(pixels, size, box, leftRatio, topRatio, widthRatio, heightRatio, color) {
  const left = Math.round(box.left + box.size * leftRatio);
  const top = Math.round(box.top + box.size * topRatio);
  const width = Math.round(box.size * widthRatio);
  const height = Math.round(box.size * heightRatio);
  const radius = Math.max(1, Math.round(box.size * 0.05));

  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      if (x < 0 || y < 0 || x >= size || y >= size) {
        continue;
      }
      if (isRoundedRectOutside(x, y, left, top, width, height, radius)) {
        continue;
      }
      setPixel(pixels, size, x, y, color);
    }
  }
}

function drawStripe(pixels, size, box, leftRatio, topRatio, widthRatio, color) {
  const left = Math.round(box.left + box.size * leftRatio);
  const top = Math.round(box.top + box.size * topRatio);
  const width = Math.round(box.size * widthRatio);
  const height = Math.max(1, Math.round(box.size * 0.045));

  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      setPixel(pixels, size, x, y, color);
    }
  }
}

function isRoundedRectOutside(x, y, left, top, width, height, radius) {
  const right = left + width - 1;
  const bottom = top + height - 1;
  const cx = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
  const cy = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y;
  return Math.hypot(x - cx, y - cy) > radius;
}

function setPixel(pixels, size, x, y, color) {
  const i = (y * size + x) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = color[3];
}

function encodePng(width, height, pixels) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    pixels.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.concat([
      uint32(width),
      uint32(height),
      Buffer.from([8, 6, 0, 0, 0])
    ])),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  return Buffer.concat([
    uint32(data.length),
    typeBuffer,
    data,
    uint32(crc32(Buffer.concat([typeBuffer, data])))
  ]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
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
