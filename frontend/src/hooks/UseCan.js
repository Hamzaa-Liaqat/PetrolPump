import { can } from '@/config/permissions';
import { useAuth } from './useAuth';

// const allowed = useCan(); if (allowed('sale.void')) { ... }
export function useCan() {
  const { role } = useAuth();
  return (action) => can(role, action);
}