import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const tests=readdirSync(new URL('../tests/',import.meta.url)).filter(name=>name.endsWith('.test.mjs')).sort();
for(const test of tests){
  const result=spawnSync(process.execPath,['--experimental-strip-types',`tests/${test}`],{cwd:root,encoding:'utf8'});
  if(result.status!==0){process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||String(result.error||''));process.exit(result.status||1);}
  console.log(`PASS ${test}`);
}
console.log(`${tests.length} test files passed.`);
