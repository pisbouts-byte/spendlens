import type { CapacitorConfig } from "@capacitor/cli";

// Android emulator uses 10.0.2.2 to reach host machine; iOS simulator uses localhost
const isAndroid = process.argv.includes("android") || process.env.CAPACITOR_PLATFORM === "android";
const devServerUrl = isAndroid ? "http://10.0.2.2:5173" : "http://localhost:5173";

const config: CapacitorConfig = {
  appId: "com.spendlens.app",
  appName: "SpendLens",
  webDir: "dist",
  server: {
    // For local development: load from Vite dev server for live reload
    // Comment this out for production builds!
    url: devServerUrl,
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#2563eb",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#2563eb",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "SpendLens",
  },
  android: {
    backgroundColor: "#f9fafb",
  },
};

export default config;
