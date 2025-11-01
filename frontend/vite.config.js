import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Remove proxy - we're using direct API calls now
      // This allows better debugging
    },
    ...(isDev && {
      define: {
        __DEV__: true
      }
    })
  }
})
