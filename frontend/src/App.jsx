import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { MarketProvider } from './context/MarketContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './layouts/AppShell';
import Landing from './pages/Landing';
import Trade from './pages/Trade';
import Markets from './pages/Markets';
import Scanner from './pages/Scanner';
import BulkTrader from './pages/BulkTrader';
import Bots from './pages/Bots';
import CopyTrading from './pages/CopyTrading';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import History from './pages/History';

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
                  <Route path="/trade" element={<Trade />} />
                  <Route path="/markets" element={<Markets />} />
                  <Route path="/scanner" element={<Scanner />} />
                  <Route path="/bulk" element={<BulkTrader />} />
                  <Route path="/bots" element={<Bots />} />
                  <Route path="/copy" element={<CopyTrading />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/profile" element={<Profile />} />
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
