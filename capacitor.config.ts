import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.updatecapacitacion.updatesim',
  appName: 'UPDATE SIM',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#000000',
    preferredContentMode: 'mobile',
    allowsLinkPreview: false
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
