// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import arraybuffer from 'vite-plugin-arraybuffer';

// https://astro.build/config
export default defineConfig({
  site: 'https://YOUR_USERNAME.github.io', // Replace YOUR_USERNAME with your GitHub username
  base: '/my-maitre/', // Required for GitHub Pages project sites
  integrations: [react()],
  vite: {
    plugins: [arraybuffer()],
  },
});
