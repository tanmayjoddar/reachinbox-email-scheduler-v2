import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import net from 'net';

function getPort(port: number): Promise<number> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(5241)); // Fallback when Windows NAT kernel-excludes 5141-5240
    s.once('listening', () => s.close(() => resolve(port)));
    s.listen(port, '127.0.0.1');
  });
}

export default defineConfig(async () => {
  const port = process.env.PORT ? Number(process.env.PORT) : await getPort(5173);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      host: '127.0.0.1',
      port,
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
