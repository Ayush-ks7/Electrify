import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Consumers } from './pages/Consumers';
import { ConsumerDetail } from './pages/ConsumerDetail';
import { Anomalies } from './pages/Anomalies';
import { AnomalyDetail } from './pages/AnomalyDetail';
import { Alerts } from './pages/Alerts';
import { Analytics } from './pages/Analytics';
import { DataQuality } from './pages/DataQuality';
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
            <Route path="anomalies" element={<Anomalies />} />
            <Route path="anomalies/:id" element={<AnomalyDetail />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="data-quality" element={<DataQuality />} />
            <Route path="system" element={<System />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
