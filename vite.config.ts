import { transformWithEsbuild } from 'vite';
import { defineConfig } from 'vitest/config';

// Builds a single ES module (dist/index.js + dist/style.css) that SillyTavern loads via manifest.json.
// SillyTavern's own modules (/scripts/...) are imported at runtime and must never be bundled.
export default defineConfig({
  plugins: [{
    // Vite 打 ES 库时不去空白（为了保留 /*#__PURE__*/ 注释）；我们是直接给酒馆加载的成品，整体压缩一遍
    name: 'rbt-minify-es',
    apply: 'build',
    renderChunk: {
      order: 'post',
      handler: (code, chunk) => transformWithEsbuild(code, chunk.fileName, { minify: true, format: 'esm', target: 'es2022', sourcemap: true, legalComments: 'none' }),
    },
  }],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    // 压缩后小约 40 KB（gzip），手机流量下首次打开快不少；出错时看 sourcemap
    minify: true,
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
