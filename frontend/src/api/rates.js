import api from './axios';

export const fetchCurrentRates = () => api.get('fuel-rates/current/');
export const fetchRates = () => api.get('fuel-rates/');
export const createRate = (payload) => api.post('fuel-rates/', payload);