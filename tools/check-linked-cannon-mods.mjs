import {Combat} from '../assets/scripts/Combat.ts';
import {simulate,summarize} from './simulate.mjs';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out=process.argv[2];if(!out||existsSync(`${out}/report.json`))throw Error('Fresh output directory required');
const original=Combat.prototype.modifyLinkedCannonShots;const rows=[],summary=[];
try{for(const enabled of [false,true]){Combat.prototype.modifyLinkedCannonShots=enabled?original:function(){};for(const engine of ['dawn','storm','haven']){const selected=[];for(let seed=1;seed<=12;seed++)selected.push({...simulate(seed,180,'balanced',{engine,module:'none'}),enabled});rows.push(...selected);summary.push({enabled,engine,...summarize(selected,180)});}}}finally{Combat.prototype.modifyLinkedCannonShots=original;}
const hashes=Object.fromEntries(['assets/scripts/Combat.ts','assets/scripts/Catalog.ts','tools/simulate.mjs','tools/check-linked-cannon-mods.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
mkdirSync(out,{recursive:true});writeFileSync(`${out}/report.json`,JSON.stringify({scenario:'Same seeds 1..12, configured starters, no modules, balanced script, 180s. Only linked cannon delivery modifiers disabled in comparator; not human gameplay evidence.',hashes,summary,rows},null,2));
console.log(JSON.stringify(summary.map(s=>({enabled:s.enabled,engine:s.engine,survival:s.horizonSurvivalRate,kills:s.metrics.kills.mean,bosses:s.metrics.bossesKilled.mean})),null,2));
