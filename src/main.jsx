import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import ErrorBoundary from "./components/ui/ErrorBoundary";

const THEME_STORAGE_KEY = "productivity-theme-v1";

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);

    if (
      stored === "light" ||
      stored === "dark" ||
      stored === "system"
    ) {
      return stored;
    }

    return "dark";
  } catch {
    return "dark";
  }
}

function applyStoredTheme() {
  const theme = getStoredTheme();

  if (theme === "system") {
    const prefersLight = window.matchMedia(
      "(prefers-color-scheme: light)"
    ).matches;

    document.documentElement.dataset.theme =
      prefersLight ? "light" : "dark";

    return;
  }

  document.documentElement.dataset.theme = theme;
}

applyStoredTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);