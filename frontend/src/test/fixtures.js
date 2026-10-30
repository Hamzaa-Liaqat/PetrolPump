export const tankFixture = (overrides = {}) => ({
  id: 1,
  name: 'Tank-1',
  fuel_type: 'petrol',
  capacity: 10000,
  current_stock: 5000,
  reorder_level: 1000,
  is_active: true,
  fill_percent: 50,
  is_low: false,
  available_space: 5000,
  ...overrides,
});

export const nozzleFixture = (overrides = {}) => ({
  id: 1,
  name: 'N1',
  fuel_type: 'petrol',
  tank: 1,
  tank_name: 'Tank-1',
  initial_reading: 1000,
  last_reading: 1000,
  current_rate: 250,
  is_active: true,
  ...overrides,
});

export const saleFixture = (overrides = {}) => ({
  id: 7,
  receipt_no: 'RCP-000007',
  nozzle: 1,
  nozzle_name: 'N1',
  fuel_type: 'petrol',
  opening_reading: '1000.00',
  closing_reading: '1100.00',
  litres: '100.00',
  rate: '250.00',
  amount: '25000.00',
  cashier_name: 'cash',
  timestamp: '2026-10-11T10:30:00Z',
  is_void: false,
  void_reason: '',
  ...overrides,
});

export const movementFixture = (overrides = {}) => ({
  id: 1,
  tank: 1,
  tank_name: 'Tank-1',
  movement_type: 'purchase',
  movement_label: 'Purchase (delivery)',
  litres_change: 5000,
  balance_after: 5000,
  reference: 'purchase:1',
  note: 'PSO / LEA-1234',
  created_by_name: 'boss',
  created_at: '2026-10-11T09:00:00Z',
  ...overrides,
});

export const dashboardFixture = (overrides = {}) => ({
  date: '2026-10-11',
  today_sales: 25000,
  litres_sold: 100,
  sale_entries: 1,
  cash_collected: 19000,
  credit_sales_today: 10000,
  credit_payments_today: 4000,
  by_fuel_today: [{ fuel_type: 'petrol', label: 'Petrol', litres: 100, amount: 25000, total: 25000 }],
  tanks: [tankFixture()],
  low_stock_tanks: [],
  credit_due_total: 6000,
  credit: { total_due: 6000, customers_with_due: 1, top_debtors: [{ id: 1, name: 'Ali Traders', balance: 6000 }], alerts_count: 0 },
  trend_7_days: [],
  staff_today: { present: 1, half_day: 0, absent: 0, unmarked: 1 },
  alerts_count: 0,
  ...overrides,
});


export const purchaseFixture = (overrides = {}) => ({
  id: 1,
  tank: 1,
  tank_name: 'Tank-1',
  supplier: 'PSO',
  tanker_number: 'LEA-1234',
  invoice_number: 'INV-1',
  litres: '5000.00',
  received_litres: '4950.00',
  dip_before: '1000.00',
  dip_after: '5950.00',
  shortage_litres: '50.00',
  invoice_amount: '1500000.00',
  cost_per_litre: '300.00',
  date: '2026-10-10',
  created_by_name: 'boss',
  created_at: '2026-10-10T09:00:00Z',
  ...overrides,
});

export const customerFixture = (overrides = {}) => ({
  id: 1,
  name: 'Ali Traders',
  phone: '03001234567',
  address: '',
  credit_limit: 100000,
  balance: 6000,
  available_credit: 94000,
  is_over_limit: false,
  last_payment_at: null,
  is_active: true,
  ...overrides,
});

export const ratesFixture = () => [
  { fuel_type: 'petrol', label: 'Petrol', rate: 250 },
  { fuel_type: 'hi_octane', label: 'Hi-Octane', rate: null },
  { fuel_type: 'diesel', label: 'Diesel', rate: null },
];

export const statementFixture = (overrides = {}) => ({
  customer: customerFixture(),
  date_from: '2026-09-12',
  date_to: '2026-10-11',
  opening_balance: 0,
  total_debits: 25000,
  total_credits: 0,
  closing_balance: 25000,
  entries: [
    {
      id: 11, type: 'sale', type_label: 'Credit sale', litres: '100.00', vehicle_number: 'LEA-1', reference: '', note: '',
      amount: '25000.00', signed_amount: '25000.00', balance_after: '25000.00', reversal_of: null, timestamp: '2026-10-11T10:00:00Z',
    },
  ],
  ...overrides,
});

export const sheetFixture = () => ({
  date: '2026-10-11',
  summary: { present: 1, half_day: 0, absent: 0, unmarked: 1 },
  rows: [
    { staff: 1, name: 'Ahmed', position: 'attendant', default_shift: 'morning', attendance_id: null, status: null, shift: null },
    { staff: 2, name: 'Bilal', position: 'cashier', default_shift: 'evening', attendance_id: 5, status: 'present', shift: 'evening' },
  ],
});

export const staffFixture = (overrides = {}) => ({
  id: 1, name: 'Ahmed', phone: '03001112233', position: 'attendant', shift: 'morning',
  daily_rate: 1500, user: null, is_active: true, ...overrides,
});

export const expenseFixture = (overrides = {}) => ({
  id: 1, category: 'electricity', category_label: 'Electricity bill', amount: '12000.00', date: '2026-10-05',
  note: 'Sept bill', reference: '', created_by_name: 'boss', created_at: '2026-10-05T09:00:00Z',
  is_void: false, void_reason: '', ...overrides,
});

export const alertsFixture = () => [
  { type: 'low_stock', severity: 'critical', title: 'Tank-1 mein tel kam hai', message: '500 litre baqi hai (limit 1000).', data: {} },
  { type: 'credit', severity: 'warning', title: 'Ali: udhaar', message: 'Baqi 6000 (limit se zyada udhaar).', data: {} },
  { type: 'unmarked_attendance', severity: 'info', title: 'Aaj ki attendance baqi hai', message: '1 staff member ki attendance mark nahi hui.', data: {} },
];


export const reportFixture = (overrides = {}) => ({
  year: 2026,
  month: 10,
  period: '2026-10',
  date_from: '2026-10-01',
  date_to: '2026-10-31',
  totals: {
    sales: 1250000, litres: 5000, entries: 12, purchases: 900000, expenses: 50000,
    salaries: 120000, salaries_is_estimate: true, profit: 180000,
  },
  by_fuel: [
    { fuel_type: 'petrol', label: 'Petrol', litres: 3000, amount: 800000, total: 800000, avg_rate: 266.67, cost_per_litre: 250, margin_per_litre: 16.67 },
    { fuel_type: 'diesel', label: 'Diesel', litres: 2000, amount: 450000, total: 450000, avg_rate: 225, cost_per_litre: null, margin_per_litre: null },
  ],
  by_nozzle: [{ nozzle: 1, name: 'N1', fuel_type: 'petrol', label: 'Petrol', litres: 3000, amount: 800000 }],
  daily: [
    { period: '2026-10-01', litres: 100, amount: 25000, entries: 3 },
    { period: '2026-10-02', litres: 0, amount: 0, entries: 0 },
  ],
  purchases: { cost: 900000, litres_invoiced: 8000, litres_received: 7950, count: 2, shortage_litres: 50 },
  expenses: { by_category: [{ category: 'electricity', label: 'Electricity bill', total: 50000 }] },
  credit: { credit_sales: 10000, credit_payments: 4000, outstanding_now: 6000 },
  sales: 1250000,
  profit: 180000,
  ...overrides,
});

export const profitLossFixture = () => ({
  year: 2026,
  months: [
    { month: 9, period: '2026-09', sales: 500000, litres: 2000, purchases: 300000, expenses: 20000, salaries: 100000, profit: 80000 },
    { month: 10, period: '2026-10', sales: 750000, litres: 3000, purchases: 600000, expenses: 30000, salaries: 20000, profit: 100000 },
  ],
  year_totals: { sales: 1250000, litres: 5000, purchases: 900000, expenses: 50000, salaries: 120000, profit: 180000 },
});

export const rateHistoryFixture = () => [
  { id: 3, fuel_type: 'petrol', rate: '265.50', effective_from: '2026-10-10T00:00:00Z', created_by_name: 'boss', created_at: '2026-10-10T00:00:00Z' },
  { id: 2, fuel_type: 'petrol', rate: '262.00', effective_from: '2026-09-25T00:00:00Z', created_by_name: 'boss', created_at: '2026-09-25T00:00:00Z' },
  { id: 1, fuel_type: 'diesel', rate: '250.00', effective_from: '2026-09-01T00:00:00Z', created_by_name: 'boss', created_at: '2026-09-01T00:00:00Z' },
];