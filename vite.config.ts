import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Pass loadEnv variables or process.env safely to the client if needed
      'process.env': env,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'), // Standard Vite alias points to /src
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Be careful grouping React separately, as React DOM and scheduler need to go with it
              if (id.includes('firebase')) return 'firebase';
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('scheduler')
              ) {
                return 'vendor';
              }
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('framer-motion') || id.includes('motion')) return 'animation';
              return 'deps';
            }
          },
        },
      },
    },
  };
});
