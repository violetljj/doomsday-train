import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'build/web-mobile');
const output = resolve(root, 'dist');
if (!existsSync(resolve(source, 'index.html'))) throw new Error('Run npm run build:web first.');
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });
const index = resolve(output, 'index.html');
writeFileSync(index, readFileSync(index, 'utf8')
  .replace(/<html>/, '<html lang="zh-CN">')
  .replace(/<title>[^<]*<\/title>/, '<title>末日列车 · 余晖防线试玩</title>')
  .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta name="description" content="装配五节车厢，调整相邻联动，在末日荒原守住列车。点击发车即可试玩。">'));
console.log('Sites static output ready: dist/');
