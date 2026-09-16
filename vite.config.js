import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { logging, server as wisp } from '@mercuryworkshop/wisp-js/server';
import { createBareServer } from '@tomphttp/bare-server-node';
import { bareModulePath } from '@mercuryworkshop/bare-as-module3';
import { libcurlPath } from '@mercuryworkshop/libcurl-transport';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
import { scramjetPath } from '@mercuryworkshop/scramjet/path';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import dotenv from 'dotenv';

dotenv.config();

const useBare = process.env.BARE !== 'false';

logging.set_level(logging.NONE);

let bare;

Object.assign(wisp.options, {
  dns_method: 'resolve',
  dns_servers: ['1.1.1.3', '1.0.0.3'],
  dns_result_order: 'ipv4first',
});

export default defineConfig({
  root: '.',
  publicDir: false,

  plugins: [
    react(),

    viteStaticCopy({
      targets: [
        {
          src: resolve('public/static/assets/**/*'),
          dest: 'assets',
        },
        {
          src: resolve('public/static/@/**/*'),
          dest: '@',
        },
        {
          src: resolve('public/static/$/**/*'),
          dest: '$',
        },
        {
          src: resolve('public/static/!/**/*'),
          dest: '!',
        },
        {
          src: resolve('public/static/e/**/*'),
          dest: 'e',
        },
        {
          src: resolve('public/static/&/**/*'),
          dest: '&',
        },
        {
          src: resolve('public/static/9/**/*'),
          dest: '9',
        },
        {
          src: resolve(libcurlPath, '*'),
          dest: 'libcurl',
        },
        {
          src: resolve(baremuxPath, '*'),
          dest: 'baremux',
        },
        {
          src: resolve(scramjetPath, '*'),
          dest: 'scram',
        },
        ...(useBare
          ? [
              {
                src: resolve(bareModulePath, '*'),
                dest: 'baremod',
              },
            ]
          : []),
        {
          src: resolve(uvPath, 'uv.handler.js'),
          dest: 'uv',
        },
        {
          src: resolve(uvPath, 'uv.client.js'),
          dest: 'uv',
        },
        {
          src: resolve(uvPath, 'uv.bundle.js'),
          dest: 'uv',
        },
        {
          src: resolve(uvPath, 'sw.js'),
          dest: 'uv',
        },
      ],
    }),

    {
      name: 'daydream-server',
      apply: 'serve',

      configureServer(server) {
        bare = createBareServer('/seal/');

        server.httpServer?.on('upgrade', (req, socket, head) => {
          if (req.url?.startsWith('/wisp/')) {
            wisp.routeRequest(req, socket, head);
            return;
          }

          if (bare.shouldRoute(req)) {
            bare.routeUpgrade(req, socket, head);
          }
        });
      },
    },

    {
      name: 'daydream-search',
      apply: 'serve',

      configureServer(server) {
        server.middlewares.use('/return', async (req, res) => {
          const url = new URL(req.url || '', 'http://localhost');
          const q = url.searchParams.get('q');

          try {
            if (!q) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'query parameter?' }));
              return;
            }

            const response = await fetch(
              `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`
            );

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(await response.json()));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'request failed' }));
          }
        });
      },
    },
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: resolve('public/pages/index.html'),

      output: {
        entryFileNames: '[hash].js',
        chunkFileNames: 'chunks/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
      },
    },

    minify: false,
    sourcemap: false,
  },

  define: {
    __ENVIRONMENT__: JSON.stringify('stable'),
  },
});
