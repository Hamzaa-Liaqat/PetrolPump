import api from './axios';

export const fetchNozzles = () => api.get('nozzles/');
export const fetchTodaySales = () => api.get('sales/', { params: { date: 'today' } });
export const createSale = (payload) => api.post('sales/', payload);
export const voidSale = (id, reason) => api.post(`sales/${id}/void/`, { reason });
export const createNozzle = (payload) => api.post('nozzles/', payload);
export const updateNozzle = (id, payload) => api.patch(`nozzles/${id}/`, payload);