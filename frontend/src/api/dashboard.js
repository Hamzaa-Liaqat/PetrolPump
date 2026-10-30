import api from './axios';

export const fetchDashboard = () => api.get('dashboard/summary/');