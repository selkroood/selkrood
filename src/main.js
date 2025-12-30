import { createApp } from 'vue'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

const shadowTheme = {
  dark: true,
  colors: {
    background: '#050505',
    surface: '#0a0a0a',
    primary: '#00ff9d',
    secondary: '#d500f9',
    error: '#ff003c',
    info: '#00d0ff',
    success: '#00ff9d',
    warning: '#fecb00',
  }
}

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'shadowTheme',
    themes: {
      shadowTheme,
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    }
  },
})

createApp(App).use(vuetify).mount('#app')