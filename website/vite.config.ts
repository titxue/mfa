import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        zh: 'zh/index.html',
        guide: 'guide/how-to-use-totp-authenticator/index.html',
        zhGuide: 'zh/guide/how-to-use-totp-authenticator/index.html',
      },
    },
  },
})
