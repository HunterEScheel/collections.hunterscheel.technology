import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Two pages, deliberately.
//
// `index.html` is the Collections app: signed in, Tailwind, one React root and a
// router. `bio.html` is the portfolio, which is public and brings 900 lines of its
// own CSS — it restyles `*`, `html`, `body` and `a` to parchment and gold. Sharing
// a page would mean scoping every one of those rules, or watching the card search
// turn into an illuminated manuscript. Separate entry points cost a page load
// between them and remove the problem entirely.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        bio: resolve(__dirname, 'bio.html'),
      },
    },
  },
});
