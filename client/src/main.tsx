import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { ToastProvider } from "./components/ui/Toast.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
);

// Initialize native plugins when running in Capacitor
if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Light });
    StatusBar.setBackgroundColor({ color: "#2563eb" });
  });
  import("@capacitor/splash-screen").then(({ SplashScreen }) => {
    SplashScreen.hide();
  });
  import("@capacitor/app").then(({ App: CapApp }) => {
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  });
}

// Register service worker for PWA support (web only, not in native)
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  !Capacitor.isNativePlatform()
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed silently
    });
  });
}
