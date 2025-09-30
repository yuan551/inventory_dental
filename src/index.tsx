import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LoginModule } from "./screens/LoginModule/LoginModule";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <LoginModule />
  </StrictMode>,
);
