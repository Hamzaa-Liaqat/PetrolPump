import { parseHundredths } from './decimal';

// Backend (sales.models.Nozzle) ke qaaide: naam 30 haroof tak, meter ki reading 0 ya zyada.
export const NOZZLE_NAME_MAX = 30;

export function validateNozzleForm({ name, tankId, initialReading }, { editing = false } = {}) {
  const errors = {};
  const trimmed = (name ?? '').trim();
  if (!trimmed) errors.name = 'Nozzle ka naam likhein.';
  else if (trimmed.length > NOZZLE_NAME_MAX) errors.name = `Naam ${NOZZLE_NAME_MAX} haroof se chhota ho.`;
  if (!editing) {
    if (!tankId) errors.tank = 'Tank chunein.';
    if (parseHundredths(initialReading) === null) {
      errors.initial_reading = 'Meter ki reading number ho (0 ya zyada, zyada se zyada 2 decimal).';
    }
  }
  return errors;
}

// Fuel hamesha tank se aata hai (backend bhi yahi check karta hai: nozzle aur tank ka fuel ek hi ho).
export function buildCreatePayload({ name, tank, initialReading }) {
  return {
    name: name.trim(),
    fuel_type: tank.fuel_type,
    tank: tank.id,
    initial_reading: String(initialReading).trim(),
  };
}

// Banne ke baad sirf naam aur chalu/band badalte hain. Meter, tank aur fuel nahi (sales ki history bigad jati).
export function buildUpdatePayload({ name, isActive }) {
  return { name: name.trim(), is_active: Boolean(isActive) };
}