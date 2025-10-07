import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { LoginModule } from "./screens/LoginModule/LoginModule";
import { RegisterModule } from "./screens/RegisterModule/RegisterModule";
import { DashboardModule } from "./screens/DashboardModule/DashboardModule";
import { InventoryModule } from "./screens/InventoryModule/InventoryModule";
import { StockLogsModule } from "./screens/StockLogsModule/StockLogsModule";
import { StockInPage } from "./screens/StockLogsModule/StockInPage";
import { StockOutPage } from "./screens/StockLogsModule/StockOutPage";
import { SupplierModule } from "./screens/SupplierModule/SupplierModule";
import { AlertsModule } from "./screens/AlertsModule/AlertsModule";
import { WasteModule } from "./screens/WasteModule/WasteModule";
import { ReportsModule } from "./screens/ReportsModule/ReportsModule";

const router = createBrowserRouter([
  { path: "/", element: <LoginModule /> },
  { path: "/register", element: <RegisterModule /> },
  { path: "/dashboard", element: <DashboardModule /> },
  { path: "/inventory", element: <InventoryModule /> },
  { path: "/stock-logs", element: <StockLogsModule /> },
  { path: "/stock-logs/in", element: <StockInPage /> },
  { path: "/stock-logs/out", element: <StockOutPage /> },
  { path: "/supplier", element: <SupplierModule /> },
  { path: "/alerts", element: <AlertsModule /> },
  { path: "/waste", element: <WasteModule /> },
  { path: "/reports", element: <ReportsModule /> },
]);

createRoot(document.getElementById("app")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);