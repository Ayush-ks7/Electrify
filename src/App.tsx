import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Shell from "./workspace/Shell";
import { Overview } from "./workspace/Overview";
const Locality = lazy(() => import("./workspace/Locality"));
const Consumers = lazy(() =>
  import("./workspace/Consumers").then((m) => ({ default: m.Consumers })),
);
const ConsumerDetail = lazy(() =>
  import("./workspace/Consumers").then((m) => ({ default: m.ConsumerDetail })),
);
const Anomalies = lazy(() =>
  import("./workspace/Investigations").then((m) => ({ default: m.Anomalies })),
);
const AnomalyDetail = lazy(() =>
  import("./workspace/Investigations").then((m) => ({
    default: m.AnomalyDetail,
  })),
);
const Cases = lazy(() =>
  import("./workspace/Investigations").then((m) => ({ default: m.Cases })),
);
const DataQuality = lazy(() => import("./workspace/DataQuality"));
const Simulation = lazy(() => import("./workspace/Simulation"));
const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 2000, refetchOnWindowFocus: false } },
});
export default function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Suspense fallback={<div className="loading">Loading workspace…</div>}>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="locality" element={<Locality />} />
              <Route path="consumers" element={<Consumers />} />
              <Route path="consumers/:id" element={<ConsumerDetail />} />
              <Route path="anomalies" element={<Anomalies />} />
              <Route path="anomalies/:id" element={<AnomalyDetail />} />
              <Route path="cases" element={<Cases />} />
              <Route path="data-quality" element={<DataQuality />} />
              <Route path="simulation" element={<Simulation />} />
              <Route
                path="dashboard"
                element={<Navigate to="/overview" replace />}
              />
              <Route
                path="alerts"
                element={<Navigate to="/anomalies" replace />}
              />
              <Route
                path="analytics"
                element={<Navigate to="/overview" replace />}
              />
              <Route
                path="system"
                element={<Navigate to="/overview" replace />}
              />
              <Route
                path="*"
                element={
                  <div className="empty">
                    <h1>Page not found</h1>
                    <a href="/overview">Return to Overview</a>
                  </div>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
