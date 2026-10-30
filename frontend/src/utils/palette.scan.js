import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findOffPaletteClasses } from '../utils/palette';

const srcDir = fileURLToPath(new URL('..', import.meta.url));

function sourceFiles(dir) {
  return readdirSync(dir, { recursive: true })
    .map((entry) => path.join(dir, String(entry)))
    .filter((file) => statSync(file).isFile())
    .filter((file) => /\.(jsx?|js)$/.test(file) && !/\.test\.(jsx?|js)$/.test(file));
}

describe('poori app mein sirf humare palette ke rang', () => {
  const files = sourceFiles(srcDir);

  it('kam az kam kuch files scan hui', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('kisi file mein Tailwind ka default ya hex rang nahi', () => {
    const problems = [];
    for (const file of files) {
      const found = findOffPaletteClasses(readFileSync(file, 'utf8'));
      if (found.length > 0) problems.push(`${path.relative(srcDir, file)}: ${found.join(', ')}`);
    }
    expect(problems).toEqual([]);
  });
});