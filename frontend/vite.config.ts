import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const isWidget = process.env.BUILD_WIDGET === 'true';

  if (isWidget) {
    // Widget-specific build configuration
    return {
      mode: 'production',
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
      build: {
        outDir: 'dist-widget',
        emptyOutDir: false,
        sourcemap: true,
        minify: 'esbuild',
        lib: {
          entry: path.resolve(__dirname, 'src/widget.tsx'),
          name: 'ChatbotWidget',
          fileName: () => 'widget.js',
          formats: ['iife'],
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            entryFileNames: 'widget.js',
          },
        },
      },
    };
  }

  // Main app build configuration
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
      host: true,
      cors: true,
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: false,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 30000,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
  };
});
