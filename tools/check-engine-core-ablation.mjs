import { Combat } from '../assets/scripts/Combat.ts';
import { ENGINE_IDS } from '../assets/scripts/Locomotives.ts';
import { simulate, summarize } from './simulate.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Process-local ablation only: preserve each selected starter, remove automatic core.
const original=Combat.prototype.updateEngine,rows=[],summary=[];
try {
  Combat.prototype.updateEngine=function(){};
  for(const engine of ENGINE_IDS){
    const selected=[];
    for(let seed=1;seed<=20;seed++)selected.push(simulate(seed,180,'balanced',{engine,module:'none'}));
    rows.push(...selected);summary.push({engine,...summarize(selected,180)});
  }
}finally{Combat.prototype.updateEngine=original;}
const hashes=Object.fromEntries(['../assets/scripts/Combat.ts','../assets/scripts/Catalog.ts','../assets/scripts/BuildProgression.ts','../assets/scripts/Locomotives.ts','../assets/scripts/Worlds.ts','./simulate.mjs','./check-engine-core-ablation.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex')]));
const path='artifacts/optimization-20260910/engine-balance';mkdirSync(path,{recursive:true});
writeFileSync(`${path}/core-ablation.json`,JSON.stringify({scenario:'Controlled process-local ablation disables Combat.updateEngine only. Natural balanced policy, matched seeds 1..20, 180s, configured starter retained, no module. The optional utility-property shape fix between this run and report.json does not change combat calculations.',hashes,summary,rows},null,2));
console.log(JSON.stringify(summary.map(r=>({engine:r.engine,survival:r.horizonSurvivalRate,hp:r.metrics.hp.mean,kills:r.metrics.kills.mean,firstMinute:r.survivalAtSeconds[60]})),null,2));
