import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// En desarrollo /api se sirve por el proxy de Vite: frontend y API quedan en el mismo origen
// y la cookie de sesión (HttpOnly, SameSite=Lax) funciona sin CORS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
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
