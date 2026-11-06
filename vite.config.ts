import { defineConfig } from 'vitest/config';

// Builds a single ES module (dist/index.js + dist/style.css) that SillyTavern loads via manifest.json.
// SillyTavern's own modules (/scripts/...) are imported at runtime and must never be bundled.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    minify: false,
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [/^\/scripts\//],
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
