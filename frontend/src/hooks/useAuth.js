import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth ko AuthProvider ke andar istemal karein.');
  return value;
}