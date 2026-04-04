import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // ナビゲーションはネットワーク優先（リダイレクト認証フローを壊さないため）
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.firebaseapp\.com\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'FloatBox - もやもや解消',
        short_name: 'FloatBox',
        description: '頭の中のモヤモヤを素早く吐き出す',
        theme_color: '#6366f1',
        background_color: '#0f0f14',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
