import { simulate, summarize } from './simulate.mjs';
import { ENGINE_IDS } from '../assets/scripts/Locomotives.ts';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const path=process.argv[2] || 'artifacts/optimization-20260910/engine-balance-regions';
const configurations=[{id:'legacy',loadout:undefined},...ENGINE_IDS.map(engine=>({id:engine,loadout:{engine,module:'none'}}))];
const rows=[],summary=[];
for(const configuration of configurations){
  const selected=[];
  for(let seed=1;seed<=20;seed++)selected.push({...simulate(seed,180,'balanced',configuration.loadout),configuration:configuration.id});
  rows.push(...selected);
  summary.push({configuration:configuration.id,...summarize(selected,180),coreActivations:selected.reduce((sum,row)=>sum+(row.engine?.activations||0),0),coreActivatedRuns:selected.filter(row=>row.engine?.activations>0).length});
}
const hashes=Object.fromEntries(['../assets/scripts/Combat.ts','../assets/scripts/Catalog.ts','../assets/scripts/BuildProgression.ts','../assets/scripts/Locomotives.ts','../assets/scripts/Worlds.ts','./simulate.mjs','./check-engine-balance.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex')]));
mkdirSync(path,{recursive:true});
writeFileSync(`${path}/report.json`,JSON.stringify({scenario:'Matched seeds 1..20; natural balanced policy; 180 seconds; each configured engine uses its own starter and no module. Engine starter and core effects are intentionally coupled; this does not isolate core-only causal damage or represent human play.',hashes,summary,rows},null,2));
console.log(JSON.stringify(summary.map(r=>({configuration:r.configuration,survival:r.horizonSurvivalRate,hp:r.metrics.hp.mean,kills:r.metrics.kills.mean,firstMinute:r.survivalAtSeconds[60],coreActivatedRuns:r.coreActivatedRuns,coreActivations:r.coreActivations})),null,2));
