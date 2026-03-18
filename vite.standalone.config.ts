import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import arraybuffer from 'vite-plugin-arraybuffer';
import { resolve } from 'path';

export default defineConfig({
  root: 'standalone',
  plugins: [react(), arraybuffer(), viteSingleFile()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
