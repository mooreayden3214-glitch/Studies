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
  root: 'public',
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
  ],

  build: {
    outDir: '../dist',
    emptyOutDir: true,

    rollupOptions: {
      input: resolve('public/pages/index.html'),
    },

    minify: false,
    sourcemap: false,
  },

  define: {
    __ENVIRONMENT__: JSON.stringify('stable'),
  },
});
