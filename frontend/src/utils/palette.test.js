import { describe, expect, it } from 'vitest';
import { findOffPaletteClasses } from './palette';
import { findWhiteSurfaces } from './palette';
describe('findOffPaletteClasses', () => {
  it('humare palette ki classes par kuch nahi', () => {
    const source = `className="bg-sand-50 text-ink-soft ring-1 ring-marigold-400/40 hover:bg-lagoon-500/25 bg-white shadow-sm
      text-warn bg-warn-bg divide-y divide-sand-200 border-dashed text-center text-lg font-bold bg-ink/40"`;
    expect(findOffPaletteClasses(source)).toEqual([]);
  });

  it('Tailwind ke default rang pakarta hai (variants ke saath bhi)', () => {
    const source = 'className="bg-blue-500 text-gray-700 hover:bg-green-600 md:border-red-300 dark:text-slate-200 ring-indigo-500"';
    expect(findOffPaletteClasses(source).sort()).toEqual(
      ['bg-blue-500', 'dark:text-slate-200', 'hover:bg-green-600', 'md:border-red-300', 'ring-indigo-500', 'text-gray-700'].sort(),
    );
  });

  it('arbitrary hex rang pakarta hai', () => {
    expect(findOffPaletteClasses('className="bg-[#ff00aa] text-[#fff] border-[1px]"').sort()).toEqual(['bg-[#ff00aa]', 'text-[#fff]']);
  });

  it('milte julte naam galat nahi pakarte (greenhouse, reddish jaise lafz, ya hamare rang)', () => {
    expect(findOffPaletteClasses('const label = "text-lagoon-700 greenhouse reddish-100 bg-coral-100"')).toEqual([]);
    expect(findOffPaletteClasses('<p className="text-rose">sirf shade ke bagair</p>')).toEqual([]);
  });

  it('ek hi class kai baar aaye to ek baar', () => {
    expect(findOffPaletteClasses('bg-blue-500 bg-blue-500 bg-blue-500')).toEqual(['bg-blue-500']);
  });
});



describe('findWhiteSurfaces', () => {
  it('bg-white (variants ke saath bhi) pakarta hai', () => {
    expect(findWhiteSurfaces('className="bg-white rounded-3xl hover:bg-white ring-white border-white"').sort()).toEqual(
      ['bg-white', 'border-white', 'hover:bg-white', 'ring-white'].sort(),
    );
  });
  it('text-white aur card wali class par kuch nahi', () => {
    expect(findWhiteSurfaces('className="bg-card text-white bg-whitespace"')).toEqual([]);
  });
});