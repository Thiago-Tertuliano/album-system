import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.axellion.album',
  appName: 'Álbum',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080b12',
    },
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#080b12',
      showSpinner: false,
    },
  },
};

export default config;
