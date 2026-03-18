// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import arraybuffer from 'vite-plugin-arraybuffer';

// https://astro.build/config
export default defineConfig({
  base: './',
  integrations: [react()],
  vite: {
    plugins: [arraybuffer()],
  },
});
