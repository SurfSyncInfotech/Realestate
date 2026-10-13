import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SavedProvider } from "./context/SavedContext.jsx";
import "./index.css";
import "./styles/v2.css";
import "./styles/pages.css";
import "./styles/property.css";
import "./styles/detail.css";
import "./styles/workspace.css";
import "./styles/auth.css";
import "./styles/ws-extra.css";
import "./styles/ws-thread.css";
import "./styles/brand.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SavedProvider>
          <App />
        </SavedProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
