import api from './axios';

export const fetchAlerts = () => api.get('alerts/');