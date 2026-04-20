import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.blacksail.colonize',
  appName: 'Colonize',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
