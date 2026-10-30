import { can } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';

// <Can action="tank.create"><Button>Naya tank</Button></Can>
export default function Can({ action, children, fallback = null }) {
  const { role } = useAuth();
  return can(role, action) ? children : fallback;
}