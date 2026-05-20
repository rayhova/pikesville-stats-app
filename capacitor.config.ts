import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pikesvillembb.app",
  appName: "Pikesville MBB",
  webDir: "native-web",
  server: {
    url: "https://app.pikesvillembb.com",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#101827",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;
