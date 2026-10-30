import { describe, expect, it } from 'vitest';
import { splitApiErrors } from './error';

const bad = (data, status = 400) => ({ response: { status, data } });
const FIELDS = ['opening_reading', 'closing_reading', 'rate'];

describe('splitApiErrors', () => {
  it('field ki ghalti field mein, baqi "general" mein', () => {
    const result = splitApiErrors(bad({ opening_reading: ['Pichla reading 1100 hai'], detail: 'Aur masla' }), FIELDS);
    expect(result.fields).toEqual({ opening_reading: 'Pichla reading 1100 hai' });
    expect(result.general).toBe('Aur masla');
  });

  it('sirf field ki ghalti ho to general khali', () => {
    const result = splitApiErrors(bad({ rate: 'Rate ghalat' }), FIELDS);
    expect(result.fields.rate).toBe('Rate ghalat');
    expect(result.general).toBe('');
  });

  it('anjaan field general mein jata hai (non_field_errors waghera)', () => {
    const result = splitApiErrors(bad({ non_field_errors: ['Koi aur masla'] }), FIELDS);
    expect(result.fields).toEqual({});
    expect(result.general).toBe('Koi aur masla');
  });

  it('400 ke ilawa ya network error par general paigham', () => {
    expect(splitApiErrors(bad({}, 403), FIELDS).general).toContain('ijazat');
    expect(splitApiErrors(new Error('Network Error'), FIELDS).general).toContain('Server se rabta');
    expect(splitApiErrors(bad(['seedhi list'], 400), FIELDS).general).toBe('seedhi list');
  });
});