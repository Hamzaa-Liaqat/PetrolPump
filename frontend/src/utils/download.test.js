import { describe, expect, it } from 'vitest';
import { filenameFromDisposition, safeFilename } from './download';

describe('safeFilename', () => {
  it('path aur khatarnak haroof hata deta hai', () => {
    expect(safeFilename('../../etc/passwd')).toBe('.._.._etc_passwd'.replace(/^\.+/, ''));
    expect(safeFilename('a/b\\c:d*e?f"g<h>i|j.pdf')).toBe('a_b_c_d_e_f_g_h_i_j.pdf');
    expect(safeFilename('...hidden')).toBe('hidden');
    expect(safeFilename('  ok.xlsx ')).toBe('ok.xlsx');
  });
});

describe('filenameFromDisposition', () => {
  const fallback = 'report.pdf';
  it('backend ka header', () => {
    expect(filenameFromDisposition('attachment; filename="petrol-pump-report-2026-10.pdf"', fallback)).toBe('petrol-pump-report-2026-10.pdf');
  });
  it('bina quotes aur utf-8 wala', () => {
    expect(filenameFromDisposition('attachment; filename=report.xlsx', fallback)).toBe('report.xlsx');
    expect(filenameFromDisposition("attachment; filename*=UTF-8''my%20report.pdf", fallback)).toBe('my report.pdf');
  });
  it('header na ho ya samajh na aaye to fallback', () => {
    expect(filenameFromDisposition(undefined, fallback)).toBe(fallback);
    expect(filenameFromDisposition('', fallback)).toBe(fallback);
    expect(filenameFromDisposition('inline', fallback)).toBe(fallback);
  });
  it('kharab percent-encoding par crash nahi', () => {
    expect(filenameFromDisposition('attachment; filename="%E0%A4%A.pdf"', fallback)).toBe('%E0%A4%A.pdf');
  });
  it('header se aaya hua path chhup kar nahi chalta', () => {
    expect(filenameFromDisposition('attachment; filename="../evil.pdf"', fallback)).toBe('.._evil.pdf'.replace(/^\.+/, ''));
  });
});