import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O AIOSON Play aloca as duas portas no spawn e injeta PORT (webview) e
// BACKEND_PORT (API). Fora do Play, os fallbacks abaixo mantêm o app rodando.
const port = Number(process.env.PORT) || 5173;
const backendPort = Number(process.env.BACKEND_PORT) || 3301;
const backendTarget = `http://127.0.0.1:${backendPort}`;

// O browser fala sempre same-origin: o proxy do Vite é o contrato oficial do
// Play para split-stack (port-management.md §8, limitação 2).
const proxy = {
  '/api': { target: backendTarget, changeOrigin: true }
};

export default defineConfig({
  plugins: [react()],
  server: { port, host: true, strictPort: true, proxy },
  preview: { port, host: true, strictPort: true, proxy }
});
