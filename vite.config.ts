import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    // PENTING: jangan pernah taruh secret (API key server) di sini — apapun yang masuk
    // ke `define` akan di-inline ke bundle JS dan bisa dibaca siapa saja lewat DevTools.
    // GEMINI_API_KEY & IMGBB_API_KEY sudah tidak diinject ke client sama sekali (server-only,
    // diakses lewat process.env asli di runtime Vercel functions).
    // Cloudinary cloud name/upload preset itu memang secara desain publik (unsigned preset),
    // tapi tetap harus lewat prefix VITE_ agar eksplisit "ini memang untuk client" — lihat
    // src/lib/uploadConfig.ts & .env.example.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      sourcemap: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion/react'],
            'vendor-icons': ['lucide-react'],
            'vendor-firebase': ['firebase/app', 'firebase/auth'],
          },
        },
      },
    },
  };
});