import api from './axios';

export const fetchPurchases = (params) => api.get('purchases/', { params });
export const createPurchase = (payload) => api.post('purchases/', payload);