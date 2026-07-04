import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { Suspense, lazy } from 'react';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { MarketProvider } from './context/MarketContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './layouts/AppShell';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

const Trade = lazy(() => import('./pages/Trade'));
const Markets = lazy(() => import('./pages/Markets'));
const Scanner = lazy(() => import('./pages/Scanner'));
const BulkTrader = lazy(() => import('./pages/BulkTrader'));
const Bots = lazy(() => import('./pages/Bots'));
const CopyTrading = lazy(() => import('./pages/CopyTrading'));
const History = lazy(() => import('./pages/History'));
const Profile = lazy(() => import('./pages/Profile'));

function PageLoader() {
  return <div className="page-loader"><div className="spinner" /></div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MarketProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/trade" element={<Suspense fallback={<PageLoader />}><Trade /></Suspense>} />
                  <Route path="/markets" element={<Suspense fallback={<PageLoader />}><Markets /></Suspense>} />
                  <Route path="/scanner" element={<Suspense fallback={<PageLoader />}><Scanner /></Suspense>} />
                  <Route path="/bulk" element={<Suspense fallback={<PageLoader />}><BulkTrader /></Suspense>} />
                  <Route path="/bots" element={<Suspense fallback={<PageLoader />}><Bots /></Suspense>} />
                  <Route path="/copy" element={<Suspense fallback={<PageLoader />}><CopyTrading /></Suspense>} />
                  <Route path="/history" element={<Suspense fallback={<PageLoader />}><History /></Suspense>} />
                  <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{ duration: 4000 }}
            />
          </AuthProvider>
        </MarketProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
