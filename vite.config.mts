/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  // depending on your application, base can also be "/"
  const env = loadEnv(mode, process.cwd(), '');
  const BASE_PATH = env.VITE_APP_BASE_NAME || '/';
  const PORT = 3000;

  return {
    server: {
      // this ensures that the browser opens upon server start
      open: true,
      // this sets a default port to 3000
      port: PORT,
      strictPort: true,
      host: true
    },
    test: {
      passWithNoTests: true,
      // A git worktree checked out inside the repo (.claude/worktrees/…) brings
      // its own copy of src/ along, and Vitest's default include glob picked up
      // every one of its test files: 50 of the 69 collected paths came from a
      // stale worktree rather than this checkout. That inflates the counts and
      // means a red run could be pointing at code you are not editing.
      // Vitest's defaults already exclude node_modules and dist.
      exclude: ['**/node_modules/**', '**/dist/**', '.claude/**']
    },
    build: {
      chunkSizeWarningLimit: 1600,
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
      }
    },
    preview: {
      open: true,
      host: true
    },
    define: {
      global: 'window'
    },
    resolve: {
      alias: {
        // { find: '', replacement: path.resolve(__dirname, 'src') },
        // {
        //   find: /^~(.+)/,
        //   replacement: path.join(process.cwd(), 'node_modules/$1')
        // },
        // {
        //   find: /^src(.+)/,
        //   replacement: path.join(process.cwd(), 'src/$1')
        // }
        // {
        //   find: 'assets',
        //   replacement: path.join(process.cwd(), 'src/assets')
        // },
        '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs'
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime']
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-router-dom',
        '@tanstack/react-query'
      ]
    },
    base: BASE_PATH,
    plugins: [react(), tsconfigPaths()]
  };
});
