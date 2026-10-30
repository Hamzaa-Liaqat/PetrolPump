import api from './axios';

export const fetchSheet = (date) => api.get('attendance/sheet/', { params: { date } });
export const markDay = (date, entries) => api.post('attendance/mark-day/', { date, entries });
export const patchAttendance = (id, status) => api.patch(`attendance/${id}/`, { status });

export const fetchStaff = () => api.get('staff/');
export const createStaff = (payload) => api.post('staff/', payload);
export const updateStaff = (id, payload) => api.patch(`staff/${id}/`, payload);
export const fetchSalaryPreview = (id, params) => api.get(`staff/${id}/salary-preview/`, { params });

export const fetchPayslips = (params) => api.get('payslips/', { params });
export const fetchPayrollSummary = (params) => api.get('payslips/summary/', { params });
export const generatePayslip = (payload) => api.post('payslips/generate/', payload);
export const markPayslipPaid = (id) => api.post(`payslips/${id}/mark-paid/`, {});
export const cancelPayslip = (id) => api.post(`payslips/${id}/cancel/`, {});