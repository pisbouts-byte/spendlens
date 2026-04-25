import type { CapacitorConfig } from "@capacitor/cli";

// Android emulator uses 10.0.2.2 to reach host machine; iOS simulator uses localhost
const isAndroid = process.argv.includes("android") || process.env.CAPACITOR_PLATFORM === "android";
const devServerUrl = isAndroid ? "http://10.0.2.2:5173" : "http://localhost:5173";

const useLiveReload = process.env.LIVE_RELOAD === "true";

const config: CapacitorConfig = {
  appId: "com.pisbouts.budgetwisely",
  appName: "BudgetWisely",
  webDir: "dist",
  ...(useLiveReload
    ? {
        server: {
          url: devServerUrl,
          cleartext: true,
        },
      }
    : {}),
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
    scheme: "BudgetWisely",
  },
  android: {
    backgroundColor: "#f9fafb",
  },
};

export default config;
