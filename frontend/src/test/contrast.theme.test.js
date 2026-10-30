// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../utils/contrast';

const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');
const theme = {};
for (const match of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) theme[match[1]] = match[2];

// [text ka rang, background, kahan istemal hota hai]  -> kam az kam 4.5
const TEXT_PAIRS = [
  ['ink', 'card', 'cards, tables, dialogs'],
  ['ink', 'sand-50', 'page ka text'],
  ['ink', 'sand-100', 'card ke andar khanay'],
  ['ink-soft', 'card', 'halka text'],
  ['ink-soft', 'sand-50', 'halka text page par'],
  ['ink-soft', 'sand-100', 'halka text khanay mein'],
  ['ink-faint', 'card', 'placeholder'],
  ['ink-faint', 'sand-100', 'placeholder khanay mein'],
  ['ink', 'marigold-500', 'asli button'],
  ['ink', 'marigold-400', 'button par mouse'],
  ['ink', 'lagoon-500', 'Present wala button'],
  ['ink', 'coral-500', 'Absent wala button, ginti ka nishan'],
  ['ink', 'coral-600', 'khatarnak button'],
  ['marigold-800', 'marigold-100', 'brand ka tag / tab'],
  ['lagoon-800', 'lagoon-100', 'kamyabi ka paigham'],
  ['coral-800', 'coral-100', 'ghalti ka paigham'],
  ['periwinkle-800', 'periwinkle-100', 'info ka paigham'],
  ['warn', 'warn-bg', 'khabardar ka paigham'],
  ['lagoon-700', 'card', 'munafa ka text'],
  ['coral-800', 'card', 'ghalti / nuqsan ka text'],
  ['warn', 'card', 'khabardar text card par'],
  ['marigold-800', 'card', 'link / tab ka text'],
  ['periwinkle-800', 'card', 'info text card par'],
  ['lagoon-700', 'sand-100', 'munafa ka text khanay mein'],
  ['coral-800', 'sand-100', 'ghalti ka text khanay mein'],
  ['header-ink', 'header', 'header ka naam'],
  ['header-soft', 'header', 'header ke links'],
  ['ink-soft', 'header', 'header mein server ki haalat'],
  ['cream-ink', 'cream', 'cream card ka label'],
  ['cream-deep', 'cream', 'cream card ki raqam'],
  ['mint-ink', 'mint', 'mint card ka label'],
  ['mint-deep', 'mint', 'mint card ki raqam'],
  ['chip-lav-ink', 'chip-lav', 'Owner chip'],
  ['chip-blue-ink', 'chip-blue', 'Manager chip'],
  ['chip-coral-ink', 'chip-coral', 'Cashier chip'],
  ['chip-green-ink', 'chip-green', 'Present / Petrol chip'],
  ['chip-red-ink', 'chip-red', 'Absent chip'],
];

// Nishan / lakeer / bar: kam az kam 3 (WCAG non-text)
const GRAPHIC_PAIRS = [
  ['marigold-400', 'card', 'focus ring'],
  ['marigold-600', 'card', 'spinner, brand icon, chart'],
  ['lagoon-500', 'card', 'tank bar'],
  ['coral-500', 'card', 'ghalti ka nishan'],
  ['periwinkle-500', 'card', 'info ka nishan'],
  ['amber', 'card', 'diesel chart'],
  ['stone', 'card', 'doosra fuel chart'],
  ['lagoon-700', 'card', 'munafa chart'],
  ['coral-800', 'card', 'nuqsan chart'],
  // Card/field ki halki border (sand-300) jaan boojh kar design jaisi halki hai, is liye yahan nahi.
];

const check = (pairs, minimum) =>
  pairs
    .filter(([fg, bg]) => contrastRatio(theme[fg], theme[bg]) < minimum)
    .map(([fg, bg, where]) => `${fg} on ${bg} (${where}): ${contrastRatio(theme[fg], theme[bg]).toFixed(2)} < ${minimum}`);

describe('index.css ke rang saaf nazar aayein', () => {
  it('har zaroori rang maujood hai', () => {
    for (const [fg, bg] of [...TEXT_PAIRS, ...GRAPHIC_PAIRS]) {
      expect(theme[fg]).toBeTruthy();
      expect(theme[bg]).toBeTruthy();
    }
  });

  it('text: kam az kam 4.5', () => {
    expect(check(TEXT_PAIRS, 4.5)).toEqual([]);
  });

  it('nishan/lakeer/bar: kam az kam 3', () => {
    expect(check(GRAPHIC_PAIRS, 3)).toEqual([]);
  });
});