import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.js')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/renderer/index.html'),
          detail: resolve(__dirname, 'src/renderer/detail.html'),
          settings: resolve(__dirname, 'src/renderer/settings.html'),
          stakeholderRegister: resolve(__dirname, 'src/renderer/stakeholder-register.html')
        }
      }
    },
    plugins: [vue()]
  }
})
