// Ek baar chalayein (frontend folder se):  node ..\scripts\use-card-color.mjs src
// Har "bg-white" (aur border/ring/divide-white) ko card wali class bana deta hai, taake dark theme mein
// cards theme ke rang se banein. text-white ko nahi chhoota.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATTERN = /(?<![\w-])((?:[a-z0-9-]+:)*)(bg|border|ring|divide)-white(?![\w-])/g;

export function replaceWhiteSurfaces(source) {
  return source.replace(PATTERN, '$1$2-card');
}

function walk(dir) {
  return readdirSync(dir, { recursive: true })
    .map((entry) => path.join(dir, String(entry)))
    .filter((file) => statSync(file).isFile() && /\.(jsx?|js)$/.test(file) && !/\.test\.(jsx?|js)$/.test(file));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] ?? 'src');
  let changed = 0;
  for (const file of walk(root)) {
    const before = readFileSync(file, 'utf8');
    const after = replaceWhiteSurfaces(before);
    if (after !== before) {
      writeFileSync(file, after);
      changed += 1;
      console.log('badla:', path.relative(root, file));
    }
  }
  console.log(`${changed} file(s) mein safed surface -> card.`);
}