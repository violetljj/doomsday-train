import { Combat } from '../assets/scripts/Combat.ts';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const out='artifacts/optimization-20260910/build-balance';
const seconds=180,seeds=12;
// This ablation retains identical current enemy rules, car levels, recipes and RNG.
// Only the new branch multipliers and overdrive eligibility are disabled.
class NoBuildBonuses extends Combat {
  get buildPower(){const base=super.buildPower;return {...base,weaponDamageMultiplier:1,linkDamageMultiplier:1,supportPowerMultiplier:1,scrapMultiplier:1,attackRateMultiplier:1,linkRateMultiplier:1,overdrive:{...base.overdrive,eligible:false,active:false}};}
}
const presets=[
  {id:'fire',cars:['cannon','cannon','rail','repair','shield'],upgrades:[0,1,2]},
  {id:'chain',cars:['cannon','fan','flame','cryo','rail'],upgrades:[0,2,4]},
  {id:'support',cars:['repair','cannon','shield','fan','rail'],upgrades:[0,1,4]},
  {id:'support-without-repair',cars:['prism','cannon','shield','fan','rail'],upgrades:[0,1,4]},
];
function run(preset,seed,bonuses){
  const m=bonuses?new Combat():new NoBuildBonuses();m.start(seed,true);m.openWorkshop();
  for(let index=0;index<preset.cars.length;index++){
    if(m.slots[index]?.type===preset.cars[index])continue;
    m.pendingCar=preset.cars[index];if(!m.install(index))throw Error('Preset install failed');
  }
  for(const index of preset.upgrades){m.pendingCar=preset.cars[index];if(!m.mergePending(index))throw Error('Preset merge failed');}
  if(!m.resumeWorkshop()||!m.startEncounter())throw Error('Preset launch failed');
  // No mid-run choices: this is a fixed-budget formation benchmark, not a normal run.
  m.nextScrap=Infinity;
  const prepared=m.slots.map(c=>({type:c.type,level:c.level}));
  if(prepared.some((c,i)=>c.type!==preset.cars[i]))throw Error('Preset assembly changed expected types');
  let damage=0,healing=0,shieldAdded=0,shieldAbsorbed=0,overdriveDamage=0;
  for(let i=0;i<seconds*30&&m.phase==='combat';i++){
    m.advance(1/30);
    for(const e of m.effects){
      if(e.type==='hit'){damage+=e.damage||0;if(m.buildPower.overdrive.active)overdriveDamage+=e.damage||0;}
      if(e.type==='passive-repair')healing+=e.size;
      if(e.type==='train-shield')shieldAdded+=e.size;
      if(e.type==='shield-damage')shieldAbsorbed+=e.size;
    }
    m.effects.length=0;
  }
  return {preset:preset.id,seed,bonuses,prepared,identity:m.buildIdentity,time:m.time,outcome:m.phase==='lose'?'lose':'horizon',hp:m.hp,kills:m.kills,bossesKilled:m.events.filter(e=>e.type==='boss_killed').length,damage,healing,shieldAdded,shieldAbsorbed,overdriveDamage,overdrives:m.events.filter(e=>e.type==='build_overdrive'),progression:m.buildProgression};
}
const rows=[];
for(const preset of presets)for(const bonuses of [false,true])for(let seed=1;seed<=seeds;seed++)rows.push(run(preset,seed,bonuses));
const mean=(rows,key)=>rows.reduce((sum,row)=>sum+row[key],0)/rows.length;
const summary=presets.map(preset=>({preset,...Object.fromEntries([false,true].map(bonuses=>{
  const selected=rows.filter(r=>r.preset===preset.id&&r.bonuses===bonuses);
  return [bonuses?'enabled':'disabled',{runs:selected.length,survival:selected.filter(r=>r.outcome==='horizon').length/selected.length,meanSeconds:mean(selected,'time'),meanHp:mean(selected,'hp'),meanKills:mean(selected,'kills'),meanBosses:mean(selected,'bossesKilled'),meanDamage:mean(selected,'damage'),meanHealing:mean(selected,'healing'),meanShieldAbsorbed:mean(selected,'shieldAbsorbed'),runsWithOverdrive:selected.filter(r=>r.overdrives.length).length,meanOverdrives:selected.reduce((sum,r)=>sum+r.overdrives.length,0)/selected.length,firstOverdrive:selected.filter(r=>r.overdrives.length).map(r=>r.overdrives[0].time)}];
}))}));
const hashes=Object.fromEntries(['../assets/scripts/Combat.ts','../assets/scripts/Catalog.ts','../assets/scripts/BuildProgression.ts','../assets/scripts/Locomotives.ts','../assets/scripts/Worlds.ts','./check-build-balance.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex')]));
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'controlled-presets.json'),JSON.stringify({scenario:'Controlled five-car, three-merge fixed budget; ordinary seeded encounters; no supply choices; matched seeds 1..12; current rules with/without branch bonuses. Not natural progression, player behavior or a complete balancing verdict.',seconds,seeds,hashes,summary,rows},null,2));
console.log(JSON.stringify(summary,null,2));
