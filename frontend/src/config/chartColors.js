// Chart.js CSS variables nahi samajhta, is liye index.css ke rangon ke hex yahan hain.
// (src/test/theme.test.js in dono ka mel check karta hai.)
export const CHART_COLORS = Object.freeze({
  marigold: '#1d9e77', // brand (teal)      = marigold-600
  marigoldSoft: '#12785a', // brand, halka  = marigold-400
  lagoon: '#97c459', // munafa             = lagoon-700
  coral: '#f09595', // nuqsan              = coral-800
  periwinkle: '#675fc8', // info           = periwinkle-500
  amber: '#f19e28', // diesel              = amber
  stone: '#b5b2a9', // doosra fuel         = stone
  ink: '#f0f1ec',
  inkSoft: '#b7b8b3',
  grid: '#30312c', // sand-300
});

export const FUEL_COLORS = Object.freeze({
  petrol: CHART_COLORS.marigold,
  hi_octane: CHART_COLORS.stone,
  diesel: CHART_COLORS.amber,
});

export const colorForFuel = (fuelType) => FUEL_COLORS[fuelType] ?? CHART_COLORS.periwinkle;