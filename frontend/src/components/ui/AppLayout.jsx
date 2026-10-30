import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { titleFor } from '@/config/navigation';
import Navbar from './Navbar';

export default function AppLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleFor(pathname);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-sand-50">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Content par jayein
      </a>
      <Navbar />
      <main id="content" className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}