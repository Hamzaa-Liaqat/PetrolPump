import api from './axios';

export const fetchUsers = () => api.get('users/');
export const createUser = (payload) => api.post('users/', payload);
export const updateUser = (id, payload) => api.patch(`users/${id}/`, payload);
export const resetUserPassword = (id, newPassword) => api.post(`users/${id}/reset-password/`, { new_password: newPassword });