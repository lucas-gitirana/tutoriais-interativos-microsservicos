'use strict';

const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

/** Copia o JSON Schema para dist/ para que fique próximo do bundle empacotado. */
function copySchema() {
  const src = path.join(__dirname, 'schema', 'tutorial.schema.json');
  const destDir = path.join(__dirname, 'dist', 'schema');
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, 'tutorial.schema.json'));
}

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  // Preferir a build ESM das dependencias (ex.: jsonc-parser): a UMD deixa
  // requires dinamicos ("./impl/format") que o esbuild nao consegue embutir.
  mainFields: ['module', 'main'],
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  logLevel: 'info'
};

async function main() {
  copySchema();
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('[esbuild] observando alterações...');
  } else {
    await esbuild.build(options);
    console.log('[esbuild] build concluído.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
