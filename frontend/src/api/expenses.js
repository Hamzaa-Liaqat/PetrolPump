import api from './axios';

export const fetchExpenses = (params) => api.get('expenses/', { params });
export const createExpense = (payload) => api.post('expenses/', payload);
export const voidExpense = (id, reason) => api.post(`expenses/${id}/void/`, { reason });