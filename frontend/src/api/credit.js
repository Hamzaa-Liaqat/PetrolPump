import api from './axios';

export const fetchCustomers = () => api.get('customers/');
export const fetchCreditSummary = () => api.get('customers/summary/');
export const createCustomer = (payload) => api.post('customers/', payload);
export const updateCustomer = (id, payload) => api.patch(`customers/${id}/`, payload);
export const fetchStatement = (id, params) => api.get(`customers/${id}/statement/`, { params });
export const createCreditSale = (payload) => api.post('credit-transactions/credit-sale/', payload);
export const createPayment = (payload) => api.post('credit-transactions/payment/', payload);
export const reverseTransaction = (id, reason) => api.post(`credit-transactions/${id}/reverse/`, { reason });