import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ot.telecom',
  appName: 'OT Telecom',
  webDir: '.',
  server: {
    androidScheme: 'https'
  }
};

export default config;
