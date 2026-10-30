// Backend ke reports.models.ExpenseCategory se mel khana chahiye. "Salary" jaan boojh kar nahi
// (wo staff ki payslip se aati hai, warna do baar ginti hoti).
export const EXPENSE_CATEGORIES = Object.freeze([
  'electricity', 'rent', 'maintenance', 'repair', 'tax', 'supplies', 'other',
]);

export const EXPENSE_LABELS = Object.freeze({
  electricity: 'Electricity bill',
  rent: 'Rent',
  maintenance: 'Maintenance',
  repair: 'Equipment repair',
  tax: 'Tax / fees',
  supplies: 'Supplies',
  other: 'Other',
});