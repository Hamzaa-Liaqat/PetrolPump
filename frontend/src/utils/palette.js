// Tailwind ke "default" rang (blue-500, gray-100 waghera) humare palette ke bahar hain.
const DEFAULT_COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green',
  'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];
const PREFIXES = 'bg|text|border|ring|divide|outline|fill|stroke|from|to|via|accent|caret|decoration|placeholder|shadow';

const OFF_PALETTE = new RegExp(
  `(?<![\\w-])(?:[a-z0-9-]+:)*(?:${PREFIXES})-(?:${DEFAULT_COLORS.join('|')})-\\d{2,3}(?![\\w-])`,
  'g',
);
const ARBITRARY_COLOR = /(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|to|via)-\[#[0-9a-fA-F]{3,8}\]/g;

export function findOffPaletteClasses(source) {
  const found = [...(source.match(OFF_PALETTE) ?? []), ...(source.match(ARBITRARY_COLOR) ?? [])];
  return [...new Set(found)];
}


// Safed surface ki class ab nahi: card ka rang theme se aata hai (card wali class). Warna dark theme mein safed patti nazar aati hai.
const WHITE_SURFACE = /(?<![\w-])(?:[a-z0-9-]+:)*(?:bg|border|ring|divide)-white(?![\w-])/g;
export function findWhiteSurfaces(source) {
  return [...new Set(source.match(WHITE_SURFACE) ?? [])];
}