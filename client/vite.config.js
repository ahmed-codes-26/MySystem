import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({ plugins: [react(), tailwindcss()], server: {
  host: '127.0.0.1', cors: false, allowedHosts: ['localhost', '127.0.0.1'],
  fs: { allow: [fileURLToPath(new URL('./', import.meta.url)), fileURLToPath(new URL('../node_modules', import.meta.url))], deny: ['**/.env', '**/.env.*', '**/*.env', '**/*.pem', '**/*.key', '**/*.p12', '**/.git/**', '**/server/**'] },
  proxy: { '/api': 'http://127.0.0.1:5000' },
} });
