import api from './axios';

export const fetchTanks = () => api.get('tanks/');
export const createTank = (payload) => api.post('tanks/', payload);
export const updateTank = (id, payload) => api.patch(`tanks/${id}/`, payload);
export const reconcileTank = (id, payload) => api.post(`tanks/${id}/reconcile/`, payload);
export const fetchStockMovements = (params) => api.get('stock-movements/', { params });