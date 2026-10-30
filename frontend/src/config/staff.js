// Backend ke staff.models (Attendance.Status, Shift, Staff.Position) se mel khana chahiye.
export const ATTENDANCE_STATUSES = Object.freeze(['present', 'half_day', 'absent']);
export const STATUS_LABELS = Object.freeze({ present: 'Present', half_day: 'Aadha din', absent: 'Absent' });

export const SHIFTS = Object.freeze(['morning', 'evening', 'night']);
export const SHIFT_LABELS = Object.freeze({ morning: 'Subah', evening: 'Shaam', night: 'Raat' });

export const POSITIONS = Object.freeze(['attendant', 'cashier', 'other']);
export const POSITION_LABELS = Object.freeze({ attendant: 'Pump attendant', cashier: 'Cashier', other: 'Other' });