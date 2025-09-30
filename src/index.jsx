import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LoginModule } from "./screens/LoginModule/LoginModule";

createRoot(document.getElementById("app")).render(
  <StrictMode>
    <LoginModule />
  </StrictMode>,
);