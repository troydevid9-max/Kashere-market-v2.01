import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    // In development the React app (5173) talks to the API (3001) through this proxy, so cookies stay same-origin.
    proxy: { '/api': 'http://localhost:3001', '/uploads': 'http://localhost:3001' }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Kashere Student Marketplace',
        short_name: 'Kashere',
        description: 'Trusted student-to-student marketplace for Federal University of Kashere',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f4f4f4',
        theme_color: '#0e0e0e',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        categories: ['shopping', 'education'],
        shortcuts: [
          { name: 'Sell an item', short_name: 'Sell', url: '/sell', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'My orders', short_name: 'Orders', url: '/orders', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        // Never serve cached HTML for API or upload URLs, and never cache API responses (they hold private data).
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'), handler: 'CacheFirst', options: { cacheName: 'product-photos', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 } } }
        ]
      }
    })
  ]
})
