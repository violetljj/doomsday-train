import { Combat } from '../assets/scripts/Combat.ts';
import { simulate, summarize } from './simulate.mjs';
import { ENGINE_IDS } from '../assets/scripts/Locomotives.ts';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const descriptor=Object.getOwnPropertyDescriptor(Combat.prototype,'spawnBatchSize');
const output=process.argv[2]||'artifacts/optimization-20260910/water-pack-pacing';
if(existsSync(`${output}/report.json`))throw Error('Report already exists; choose a fresh output directory to preserve the prior result.');
const rows=[],summary=[];
try {
  for(const engine of ENGINE_IDS)for(const grouped of [false,true]) {
    Object.defineProperty(Combat.prototype,'spawnBatchSize',grouped?descriptor:{configurable:true,get(){return 1;}});
    const selected=[];
    for(let seed=1;seed<=12;seed++)selected.push({...simulate(seed,180,'balanced',{engine,module:'none'}),grouped});
    rows.push(...selected);summary.push({engine,grouped,...summarize(selected,180)});
  }
} finally {Object.defineProperty(Combat.prototype,'spawnBatchSize',descriptor);}
const firstMinuteMismatches=rows.filter(r=>r.grouped).filter(r=>{
  const prior=rows.find(p=>!p.grouped&&p.seed===r.seed&&p.loadout.engine===r.loadout.engine);
  return JSON.stringify(r.choices.filter(c=>c.time<60))!==JSON.stringify(prior.choices.filter(c=>c.time<60));
}).length;
const hashes=Object.fromEntries(['assets/scripts/Combat.ts','assets/scripts/Catalog.ts','assets/scripts/BuildProgression.ts','assets/scripts/Locomotives.ts','assets/scripts/Worlds.ts','tools/simulate.mjs','tools/check-spawn-pacing.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
mkdirSync(output,{recursive:true});
writeFileSync(`${output}/report.json`,JSON.stringify({scenario:'Matched seeds 1..12, three configured engines without modules, balanced scripted choices, 180 seconds. Current grouped scheduling versus process-local single-spawn scheduling. Water emergence is active in both arms. This is a regression diagnostic, not human difficulty or fun evidence.',hashes,firstMinuteMismatches,summary,rows},null,2));
console.log(JSON.stringify({firstMinuteMismatches,summary:summary.map(s=>({engine:s.engine,grouped:s.grouped,survival:s.horizonSurvivalRate,meanSeconds:s.metrics.seconds.mean,kills:s.metrics.kills.mean}))},null,2));
