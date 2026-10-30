import { formatHundredths, parseHundredths } from './decimal';

// Backend ke inventory.models.Purchase aur reports.services ke 0.5% wale qaaide se mel.
export const SHORTAGE_ALERT_PERCENT = 0.5;

// SIRF andaza. Asli received/shortage backend nikalta hai.
export function previewDelivery({ litres, invoiceAmount, useDips, dipBefore, dipAfter, availableSpace }) {
  if (litres === '' || litres === null || litres === undefined) return { ok: false, error: '' };
  const invoiced = parseHundredths(litres);
  if (invoiced === null || invoiced <= 0n) {
    return { ok: false, error: 'Invoice ke litres 0 se zyada number hon (zyada se zyada 2 decimal).' };
  }

  let received = invoiced;
  if (useDips) {
    if (!dipBefore || !dipAfter) return { ok: false, error: '' };
    const before = parseHundredths(dipBefore);
    const after = parseHundredths(dipAfter);
    if (before === null || after === null) {
      return { ok: false, error: 'Dip readings mein sirf number likhein (zyada se zyada 2 decimal).' };
    }
    if (after <= before) return { ok: false, error: 'Dip after, dip before se zyada honi chahiye.' };
    received = after - before;
  }

  const space = parseHundredths(availableSpace);
  if (space !== null && received > space) {
    return { ok: false, error: `Tank mein sirf ${formatHundredths(space)} litre jagah hai.` };
  }

  const shortage = invoiced - received;
  const shortagePercent = (Number(shortage) / Number(invoiced)) * 100;
  const amount = parseHundredths(invoiceAmount);
  const costPerLitre =
    amount !== null && amount > 0n ? formatHundredths((amount * 200n + invoiced) / (2n * invoiced)) : null;

  return {
    ok: true,
    error: '',
    received: formatHundredths(received),
    shortage: formatHundredths(shortage),
    shortagePercent: shortagePercent.toFixed(2),
    hasShortage: shortage > 0n,
    significant: shortagePercent > SHORTAGE_ALERT_PERCENT,
    costPerLitre,
  };
}