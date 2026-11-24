import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import net from 'net';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: 5241,
      strictPort: true,
      // Single-origin proxy: the browser sees one origin so the httpOnly `token`
      // cookie set by the backend travels with every fetch automatically.
      proxy: {
        '/api': 'http://localhost:3000',
        '/auth': 'http://localhost:3000',
        '/slack': 'http://localhost:3000',
        '/admin': 'http://localhost:3000',
      },
    },
  };
});
