import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Consumers } from './pages/Consumers';
import { ConsumerDetail } from './pages/ConsumerDetail';
import { System } from './pages/System';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="consumers" element={<Consumers />} />
            <Route path="consumers/:id" element={<ConsumerDetail />} />
            <Route path="anomalies" element={<Navigate to="/consumers" replace />} />
            <Route path="anomalies/:id" element={<Navigate to="/consumers" replace />} />
            <Route path="cases" element={<Navigate to="/consumers" replace />} />
            <Route path="alerts" element={<Navigate to="/consumers" replace />} />
            <Route path="analytics" element={<Navigate to="/dashboard" replace />} />
            <Route path="data-quality" element={<Navigate to="/consumers" replace />} />
            <Route path="system" element={<System />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
