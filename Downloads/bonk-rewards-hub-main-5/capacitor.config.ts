import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bonkback.app',
  appName: 'BonkBack',
  webDir: 'dist',
  server: {
    url: 'https://app.bonkback.com',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#020617',
      showSpinner: false
    }
  }
};

export default config;