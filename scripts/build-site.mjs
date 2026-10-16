import { cpSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUTPUT_DIR = resolve(ROOT, 'dist');
const FILES = [
  ['index.html', 'index.html'],
  ['src/main.js', 'main.js'],
  ['src/styles.css', 'styles.css'],
  ['public/quotes.png', 'quotes.png'],
];

rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(OUTPUT_DIR, { recursive: true });

for (const [source, destination] of FILES) {
  const sourcePath = resolve(ROOT, source);
  if (!statSync(sourcePath).isFile()) {
    throw new Error(`Expected a file at ${source}`);
  }
  cpSync(sourcePath, resolve(OUTPUT_DIR, destination));
}

console.log(`Built the static site in ${OUTPUT_DIR} without third-party build dependencies.`);
