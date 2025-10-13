import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Outlet, useNavigation, useLocation } from "react-router-dom";
import LoadingOverlay from "./components/LoadingOverlay";
import { LoginModule } from "./screens/LoginModule/LoginModule";
import { RegisterModule } from "./screens/RegisterModule/RegisterModule";
import { DashboardModule } from "./screens/DashboardModule/DashboardModule";
import RequireAuth from './components/RequireAuth';
import { InventoryModule } from "./screens/InventoryModule/InventoryModule";
import { StockLogsModule } from "./screens/StockLogsModule/StockLogsModule";
import { StockInPage } from "./screens/StockLogsModule/StockInPage";
import { StockOutPage } from "./screens/StockLogsModule/StockOutPage";
import { SupplierModule } from "./screens/SupplierModule/SupplierModule";
import { AlertsModule } from "./screens/AlertsModule/AlertsModule";
import { WasteModule } from "./screens/WasteModule/WasteModule";
import { ReportsModule } from "./screens/ReportsModule/ReportsModule";

// Single-root layout that lives inside the router so useNavigation() works
const RootLayout = () => {
  const nav = useNavigation();
  const location = useLocation();
  // If the router provides a navigation state (data-router), prefer it
  const navLoading = nav && (nav.state === 'loading' || nav.state === 'submitting');

  // For normal client-side navigation (no loaders), show a short overlay on location change
  const [isNavigating, setIsNavigating] = React.useState(false);
  const prevPathRef = React.useRef(location.pathname);

  React.useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setIsNavigating(true);
      const t = setTimeout(() => setIsNavigating(false), 700);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [location.pathname]);

  const isLoading = Boolean(navLoading || isNavigating);

  // One-time sessionStorage cleanup: remove any cached entries that contain
  // sentinel placeholder documents (ids 'dont' or 'dummy'). This prevents
  // stale placeholder data from showing after you cleared Firestore.
  React.useEffect(() => {
    try {
      // Safer cleanup: only target known cache key patterns used by the app.
      // - reports_cache:*  -> reports module caches
      // - <tab>_cache_v1    -> inventory per-tab caches (consumables_cache_v1, medicines_cache_v1, equipment_cache_v1)
      // - dashboard_inventory_cache_v2 -> dashboard inventory cache
      // - dashboard_usage_trend_v1 -> dashboard trend cache
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key) continue;
        if (typeof key !== 'string') continue;
        if (key.startsWith('reports_cache:')) keysToRemove.push(key);
        else if (/^(consumables|medicines|equipment)_cache_v1$/.test(key)) keysToRemove.push(key);
        else if (key === 'dashboard_inventory_cache_v2' || key === 'dashboard_usage_trend_v1') keysToRemove.push(key);
      }
      keysToRemove.forEach(k => { try { sessionStorage.removeItem(k); } catch (e) {} });
    } catch (e) {
      // defensive: if anything goes wrong, do not block the app
      console.warn('Session cache cleanup failed', e);
    }
  }, []);

  return (
    <>
      <LoadingOverlay open={isLoading} text="medicare" />
      <Outlet />
    </>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LoginModule /> },
      { path: 'register', element: <RegisterModule /> },
  { path: 'dashboard', element: <RequireAuth><DashboardModule /></RequireAuth> },
      { path: 'inventory', element: <InventoryModule /> },
      { path: 'stock-logs', element: <StockLogsModule /> },
      { path: 'stock-logs/in', element: <StockInPage /> },
      { path: 'stock-logs/out', element: <StockOutPage /> },
      { path: 'supplier', element: <SupplierModule /> },
      { path: 'alerts', element: <AlertsModule /> },
      { path: 'waste', element: <WasteModule /> },
      { path: 'reports', element: <ReportsModule /> },
    ],
  },
]);

createRoot(document.getElementById("app")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
