import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mihuerto.app',
  appName: 'Mi Huerto',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    App: {
      launchUrl: 'com.mihuerto.app://'
    }
  }
}

export default config