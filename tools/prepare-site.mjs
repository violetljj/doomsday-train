import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'build/web-mobile');
const output = resolve(root, 'dist');
if (!existsSync(resolve(source, 'index.html'))) throw new Error('Run npm run build:web first.');
// Hash complete output, so code, configuration and imagery always travel together.
const hash=createHash('sha256');
function digest(dir){for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const path=resolve(dir,entry.name);hash.update(path.slice(source.length));if(entry.isDirectory())digest(path);else hash.update(readFileSync(path));}}
digest(source);const revision=hash.digest('hex').slice(0,16);
const release=resolve(output,'releases',revision);mkdirSync(release,{recursive:true});cpSync(source,release,{recursive:true});
const index = resolve(release, 'index.html');
writeFileSync(index, readFileSync(index, 'utf8')
  .replace(/<html>/, '<html lang="zh-CN">')
  .replace(/<title>[^<]*<\/title>/, '<title>末日列车 · 余晖防线试玩</title>')
  .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta name="description" content="装配五节车厢，调整相邻联动，在末日荒原守住列车。点击发车即可试玩。">')
  .replace('</head>', `<script>fetch('/version.json',{cache:'no-store'}).then(r=>r.json()).then(v=>{if(v.revision!==${JSON.stringify(revision)}&&/^[a-f0-9]{16}$/.test(v.revision))location.replace('/releases/'+v.revision+'/')}).catch(()=>{});</script></head>`));
writeFileSync(resolve(output,'version.json'),JSON.stringify({revision}));
writeFileSync(resolve(output,'_headers'),'/\n  Cache-Control: no-store\n/version.json\n  Cache-Control: no-store\n/releases/*\n  Cache-Control: public, max-age=31536000, immutable\n');
writeFileSync(resolve(output,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Cache-Control" content="no-store"><title>末日列车 · 余晖防线试玩</title><body style="background:#211f32;color:#f0dfd0;display:grid;place-items:center;height:90vh;font:18px serif"><p id="status">列车整备中…</p><script>fetch('/version.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(v=>{if(!/^[a-f0-9]{16}$/.test(v.revision))throw Error();location.replace('/releases/'+v.revision+'/')}).catch(()=>{document.getElementById('status').textContent='连接暂未完成，请刷新重试。'});</script></body></html>`);
console.log('Sites static output ready: dist/');
