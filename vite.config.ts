import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Four pages, deliberately.
//
// `index.html` is the Collections app: signed in, Tailwind, one React root and a
// router. `bio.html` is the portfolio, `hexmap.html` the campaign companion and
// `fireworks.html` the fireworks pledge tracker — all public, and each bringing its
// own CSS that restyles `:root`, `html` and `body`. Sharing a page would mean
// scoping every one of those rules, or watching the card search turn into an
// illuminated manuscript. Separate entry points cost a page load between them and
// remove the problem entirely.
//
// It also keeps the public pages out of the sign-in gate, which is where a
// portfolio, a game your players follow a link to and a pledge page your
// neighbours follow a link to all belong.

// The same rewrites vercel.json does, for `vite` and `vite preview`: without them
// both fall back to index.html, so /hexmap or a deep link like /fireworks/receipts
// opens the Collections app instead.
const pageRewrites: [RegExp, string][] = [
  [/^\/bio\/?$/, '/bio.html'],
  [/^\/hexmap\/?$/, '/hexmap.html'],
  [/^\/fireworks(\/.*)?$/, '/fireworks.html'],
];

function rewritePages(req: { url?: string }, _res: unknown, next: () => void) {
  const path = req.url?.split('?')[0] ?? '';
  const match = pageRewrites.find(([pattern]) => pattern.test(path));
  if (match) req.url = match[1] + (req.url!.slice(path.length));
  next();
}

const separatePages: Plugin = {
  name: 'separate-pages',
  configureServer: (server) => void server.middlewares.use(rewritePages),
  configurePreviewServer: (server) => void server.middlewares.use(rewritePages),
};

export default defineConfig({
  plugins: [react(), tailwindcss(), separatePages],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        bio: resolve(import.meta.dirname, 'bio.html'),
        hexmap: resolve(import.meta.dirname, 'hexmap.html'),
        fireworks: resolve(import.meta.dirname, 'fireworks.html'),
      },
    },
  },
});
