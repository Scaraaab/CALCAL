// Genera los iconos PNG de la PWA a partir del SVG.
// Requiere: npm install -D sharp
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('public/icons/icon.svg');
const OUT_DIR = path.resolve('public/icons');
if (!fs.existsSync(SRC)) {
  console.error('Falta public/icons/icon.svg');
  process.exit(1);
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
];

const svgBuffer = fs.readFileSync(SRC);

for (const { name, size } of sizes) {
  await sharp(svgBuffer, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join(OUT_DIR, name));
  console.log('✓', name);
}
console.log('Iconos generados.');
