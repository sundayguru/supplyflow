/// <reference types="vitest/config" />
import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  plugins: [
    devtoolsJson(),
    !process.env.VITEST && cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    // https://github.com/remix-run/react-router/discussions/12655#discussioncomment-11720266
    !process.env.VITEST && reactRouter(),
    tsconfigPaths(),
  ],
});
