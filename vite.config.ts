import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// En desarrollo /api se sirve por el proxy de Vite: frontend y API quedan en el mismo origen
// y la cookie de sesión (HttpOnly, SameSite=Lax) funciona sin CORS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      // App instalable. El service worker guarda solo los archivos de la web (HTML, JS, CSS, iconos): los datos de /api/*
      // nunca se cachean, así que las notas y entregas siempre vienen de la API y la sesión (cookie) no se toca.
      VitePWA({
        registerType: 'prompt', // el estudiante decide cuándo recargar con la versión nueva
        injectRegister: false, // se registra desde PwaPrompt
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Academic Hub',
          short_name: 'Academic Hub',
          description: 'Tus materias, entregas y avisos de UTEC en un solo lugar.',
          lang: 'es',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#FAF8F5',
          background_color: '#F7F6F2',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//], // las llamadas a la API jamás se resuelven con el index.html
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
      }),
    ],
    build: {
      // Librerías estables en archivos propios: se cachean entre despliegues.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['motion'],
            query: ['@tanstack/react-query'],
            charts: ['recharts'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy: { '/api': { target: env.VITE_API_BASE_URL || 'http://127.0.0.1:4000', changeOrigin: false } },
    },
  };
});
