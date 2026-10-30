import api from './axios';

export const loginRequest = (username, password) => api.post('auth/login/', { username, password });
export const fetchMe = () => api.get('auth/me/');
export const logoutRequest = (refresh) => api.post('auth/logout/', { refresh });
export const fetchHealth = () => api.get('health/', { timeout: 5000 });
export const updateMeRequest = (payload) => api.patch('auth/me/', payload);
export const changePasswordRequest = (oldPassword, newPassword) =>
  api.post('auth/change-password/', { old_password: oldPassword, new_password: newPassword });