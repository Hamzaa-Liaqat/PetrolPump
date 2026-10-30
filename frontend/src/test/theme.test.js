// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHART_COLORS } from '../config/chartColors';

const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');

function themeColors(source) {
  const colors = {};
  for (const match of source.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    colors[match[1]] = match[2].toLowerCase();
  }
  return colors;
}

describe('chart ke rang aur index.css ke rang ek hi hain', () => {
  const theme = themeColors(css);

  it('CHART_COLORS har rang ke saath mel khata hai', () => {
    const pairs = {
      marigold: 'marigold-600',
      marigoldSoft: 'marigold-400',
      lagoon: 'lagoon-700',
      coral: 'coral-800',
      periwinkle: 'periwinkle-500',
      amber: 'amber',
      stone: 'stone',
      ink: 'ink',
      inkSoft: 'ink-soft',
      grid: 'sand-300',
    };
    for (const [key, token] of Object.entries(pairs)) {
      expect(theme[token]).toBeTruthy();
      expect(CHART_COLORS[key]).toBe(theme[token]);
    }
  });

  it('CHART_COLORS mein koi rang aisa nahi jis ka mel upar na likha ho', () => {
    expect(Object.keys(CHART_COLORS).sort()).toEqual(
      ['amber', 'coral', 'grid', 'ink', 'inkSoft', 'lagoon', 'marigold', 'marigoldSoft', 'periwinkle', 'stone'].sort(),
    );
  });
});