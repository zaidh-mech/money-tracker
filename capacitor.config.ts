import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zaidh.moneytracker",
  appName: "My Money",
  webDir: "out",
  android: { allowMixedContent: false },
};

export default config;
