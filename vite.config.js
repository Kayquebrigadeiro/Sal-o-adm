import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  server: {
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/.git/**']
    }
  },

  optimizeDeps: {
    // Pré-otimize dependências pesadas
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js']
  },

  build: {
    // Otimizações de build
    minify: 'esbuild',  // Mais rápido que terser
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Chunk splitting para melhor cache
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    }
  }
})
