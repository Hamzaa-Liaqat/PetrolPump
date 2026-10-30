import { Navigate, Outlet, useLocation } from 'react-router';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Forbidden from '@/pages/Forbiden';
import { useAuth } from '@/hooks/useAuth';

function CenteredCard({ children }) {
  return <div className="grid min-h-[60vh] place-items-center px-4">{children}</div>;
}

export default function ProtectedRoute({ roles, children }) {
  const { status, role, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <CenteredCard>
        <div className="flex items-center gap-3 text-ink-soft" role="status">
          <Spinner className="h-6 w-6 text-marigold-600" />
          <span className="font-semibold">Check ho raha hai...</span>
        </div>
      </CenteredCard>
    );
  }

  if (status === 'unreachable') {
    return (
      <CenteredCard>
        <div className="max-w-sm rounded-3xl bg-card p-6 text-center shadow-sm ring-1 ring-sand-300">
          <h1 className="text-lg font-extrabold text-ink">Server tak pohonch nahi paaye</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Internet ya backend check karein. Aap ka login mehfooz hai.
          </p>
          <Button className="mt-4" onClick={retry}>
            Dobara koshish karein
          </Button>
        </div>
      </CenteredCard>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(role)) {
    return <Forbidden />;
  }

  return children ?? <Outlet />;
}