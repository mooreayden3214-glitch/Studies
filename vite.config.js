import { defineConfig, normalizePath } from 'vite';
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

const useBare = process.env.BARE === 'false' ? false : true;

logging.set_level(logging.NONE);

let bare;

Object.assign(wisp.options, {
  dns_method: 'resolve',
  dns_servers: ['1.1.1.3', '1.0.0.3'],
  dns_result_order: 'ipv4first',
});

const routeRequest = (req, resOrSocket, head) => {
  if (req.url?.startsWith('/wisp/')) {
    return wisp.routeRequest(req, resOrSocket, head);
  }

  if (bare?.shouldRoute(req)) {
    return head
      ? bare.routeUpgrade(req, resOrSocket, head)
      : bare.routeRequest(req, resOrSocket);
  }
};

export default defineConfig({
  root: 'public',

  publicDir: false,

  plugins: [
    react(),

    viteStaticCopy({
      targets: [
        {
          src: 'assets/**/*',
          dest: 'assets',
        },
        {
          src: '@/**/*',
          dest: '@',
        },
        {
          src: '$/**/*',
          dest: '$',
        },
        {
          src: '!/**/*',
          dest: '!',
        },
        {
          src: 'e/**/*',
          dest: 'e',
        },
        {
          src: '&/**/*',
          dest: '&',
        },

        {
          src: [normalizePath(resolve(libcurlPath, '*'))],
          dest: 'libcurl',
        },
        {
          src: [normalizePath(resolve(baremuxPath, '*'))],
          dest: 'baremux',
        },
        {
          src: [normalizePath(resolve(scramjetPath, '*'))],
          dest: 'scram',
        },
        useBare && {
          src: [normalizePath(resolve(bareModulePath, '*'))],
          dest: 'baremod',
        },
        {
          src: [
            normalizePath(resolve(uvPath, 'uv.handler.js')),
            normalizePath(resolve(uvPath, 'uv.client.js')),
            normalizePath(resolve(uvPath, 'uv.bundle.js')),
            normalizePath(resolve(uvPath, 'sw.js')),
          ],
          dest: 'uv',
        },
      ].filter(Boolean),
    }),

    {
      name: 'server',
      apply: 'serve',

      configureServer(server) {
        bare = createBareServer('/seal/');

        server.httpServer?.on(
          'upgrade',
          (req, sock, head) => {
            routeRequest(req, sock, head);
          }
        );

        server.middlewares.use((req, res, next) => {
          routeRequest(req, res) || next();
        });
      },
    },

    {
      name: 'search',
      apply: 'serve',

      configureServer(server) {
        server.middlewares.use('/return', async (req, res) => {
          const q = new URL(req.url, 'http://localhost')
            .searchParams
            .get('q');

          try {
            const result =
              q &&
              (await fetch(
                `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`
              ));

            res.setHeader(
              'Content-Type',
              'application/json'
            );

            res.end(
              JSON.stringify(
                result
                  ? await result.json()
                  : { error: 'query parameter?' }
              )
            );
          } catch {
            res.end(
              JSON.stringify({
                error: 'request failed',
              })
            );
          }
        });
      },
    },
  ],

  build: {
    outDir: '../dist',
    emptyOutDir: true,

    rollupOptions: {
      input: resolve(
        process.cwd(),
        'public/pages/index.html'
      ),

      output: {
        entryFileNames: '[hash].js',
        chunkFileNames: 'chunks/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
      },
    },

    minify: false,
    sourcemap: false,

    esbuild: {
      legalComments: 'none',
      treeShaking: true,
    },
  },

  css: {
    modules: {
      generateScopedName: () =>
        String.fromCharCode(
          97 + Math.floor(Math.random() * 17)
        ) +
        Math.random()
          .toString(36)
          .substring(2, 8),
    },
  },

  server: {
    proxy: {
      '': {
        target: '',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/assets\/img/,
            '/img'
          ),
      },
    },
  },

  define: {
    __ENVIRONMENT__: JSON.stringify('stable'),
  },
});
