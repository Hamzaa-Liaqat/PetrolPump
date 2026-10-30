import api from './axios';

export const fetchReportSummary = ({ year, month }) => api.get('reports/summary/', { params: { year, month } });
export const fetchProfitLoss = ({ year, month }) => api.get('reports/profit-loss/', { params: { year, month } });
export const fetchSalesTrend = (params) => api.get('reports/sales-trend/', { params });
export const downloadReport = ({ year, month, file }) =>
  api.get('reports/export/', { params: { year, month, file }, responseType: 'blob' });