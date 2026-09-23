import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Three pages, deliberately.
//
// `index.html` is the Collections app: signed in, Tailwind, one React root and a
// router. `bio.html` is the portfolio and `hexmap.html` the campaign companion —
// both public, and each bringing a thousand-odd lines of its own CSS that restyle
// `*`, `html` and `body`. Sharing a page would mean scoping every one of those
// rules, or watching the card search turn into an illuminated manuscript. Separate
// entry points cost a page load between them and remove the problem entirely.
//
// It also keeps the two public pages out of the sign-in gate, which is where a
// portfolio and a game your players follow a link to both belong.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        bio: resolve(__dirname, 'bio.html'),
        hexmap: resolve(__dirname, 'hexmap.html'),
      },
    },
  },
});
