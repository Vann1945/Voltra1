import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import type { OutputAsset } from 'rollup';
import million from 'million/compiler';

function inlineCssPlugin(): Plugin {
  return {
    name: 'inline-css-into-html',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const isAsset = (f: (typeof bundle)[string]): f is OutputAsset => f.type === 'asset';
      const htmlFile = Object.values(bundle).find((f) => isAsset(f) && f.fileName.endsWith('.html')) as
        | OutputAsset
        | undefined;
      if (!htmlFile) return;
      const cssFiles = Object.values(bundle).filter(
        (f) => isAsset(f) && f.fileName.endsWith('.css'),
      ) as OutputAsset[];
      if (cssFiles.length === 0) return;
      let html = htmlFile.source as string;
      for (const cssFile of cssFiles) {
        const linkRegex = new RegExp(
          `<link[^>]*href="[^"]*${cssFile.fileName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"[^>]*>`,
        );
        const cssSource = typeof cssFile.source === 'string' ? cssFile.source : Buffer.from(cssFile.source).toString('utf-8');
        html = html.replace(linkRegex, `<style>${cssSource}</style>`);
        delete bundle[cssFile.fileName];
      }
      htmlFile.source = html;
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: process.env.BASE_PATH ?? '/',
    plugins: [million.vite({ auto: true }), react(), tailwindcss(), inlineCssPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3002,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      sourcemap: false,
      target: 'es2020',
      cssCodeSplit: false,
      cssMinify: true,
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
