import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import App from './App.tsx';
import LoginPage from './pages/LoginPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import { isAdmin } from './utils/authHelpers';
import './index.css';

type AppView = 'quotation' | 'admin';

function readViewFromHash(): AppView {
  return window.location.hash === '#admin' ? 'admin' : 'quotation';
}

function RootApp() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<AppView>(readViewFromHash);

  useEffect(() => {
    const onHashChange = () => setView(readViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openAdmin = useCallback(() => {
    window.location.hash = 'admin';
    setView('admin');
  }, []);

  const backToQuotation = useCallback(() => {
    window.location.hash = '';
    setView('quotation');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        載入中…
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (view === 'admin') {
    if (!isAdmin(user)) {
      if (window.location.hash === '#admin') {
        window.location.hash = '';
      }
      return <App onOpenAdmin={undefined} />;
    }
    return <AdminPage onBack={backToQuotation} />;
  }

  return <App onOpenAdmin={isAdmin(user) ? openAdmin : undefined} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  </StrictMode>
);
