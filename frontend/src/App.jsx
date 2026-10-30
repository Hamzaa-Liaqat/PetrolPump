import { Navigate, Route, Routes } from 'react-router';
import AppLayout from '@/components/ui/AppLayout';
import ProtectedRoute from '@/components/ui/ProtectedRoute';
import { NAV_ITEMS, homePathFor } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import ComingSoon from '@/pages/CommingSoon';
import CreditLedger from '@/pages/CreditLedger';
import Dashboard from '@/pages/Dashboard';
import Expenses from '@/pages/Expenses';
import FuelRates from '@/pages/FuelRates';
import Inventory from '@/pages/Inventory';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Profile from '@/pages/Profile';
import Reports from '@/pages/Reports';
import SalesEntry from '@/components/sales/SalesEntery';
import StaffAttendance from '@/pages/StaffAttendance';
import TankerPurchase from '@/pages/TankerPurchase';
import Users from '@/pages/Users';

// Ab har menu ka apna page hai. ComingSoon sirf us waqt ke liye jab naya page jode.
const PAGES = {
  dashboard: Dashboard,
  billing: SalesEntry,
  tanks: Inventory,
  purchases: TankerPurchase,
  credit: CreditLedger,
  staff: StaffAttendance,
  expenses: Expenses,
  reports: Reports,
  rates: FuelRates,
  users: Users,
  profile: Profile,
};

function HomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={homePathFor(role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        {NAV_ITEMS.map((item) => {
          const Page = PAGES[item.key];
          return (
            <Route
              key={item.key}
              path={item.path}
              element={
                <ProtectedRoute roles={item.roles}>
                  {Page ? <Page /> : <ComingSoon title={item.label} />}
                </ProtectedRoute>
              }
            />
          );
        })}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}