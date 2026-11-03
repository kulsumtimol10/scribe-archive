import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { ROUTES } from './src/lib/routes.ts';

/**
 * GitHub Pages serves plain files and can't rewrite URLs. Copy the app shell
 * into each page's folder so links like /scribe-archive/read open directly,
 * and to 404.html so a mistyped link still shows the site's own lost page.
 */
function pageShells(): Plugin {
  let outDir = 'dist';
  return {
    name: 'page-shells',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const shell = resolve(outDir, 'index.html');
      for (const path of Object.values(ROUTES)) {
        if (path === '/') continue;
        const folder = resolve(outDir, path.slice(1));
        await mkdir(folder, { recursive: true });
        await copyFile(shell, resolve(folder, 'index.html'));
      }
      await copyFile(shell, resolve(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  // Served from https://kulsumtimol10.github.io/scribe-archive/
  base: '/scribe-archive/',
  plugins: [react(), pageShells()],
  server: { port: 5190 },
});
