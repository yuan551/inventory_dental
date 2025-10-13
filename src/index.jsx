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
