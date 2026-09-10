import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { WORLD_IDS } from '../assets/scripts/Worlds.ts';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const m=new Combat();m.start(1,true,{engine:'storm',module:'none'});m.openWorkshop();
const types=['cannon','fan','flame','cryo','rail'];
for(let i=0;i<types.length;i++){m.pendingCar=types[i];assert.ok(m.install(i));}
for(const i of [0,2,4]){m.pendingCar=types[i];assert.ok(m.mergePending(i));}
assert.ok(m.resumeWorkshop());assert.ok(m.startEncounter());
// Explicit controlled soak: enlarged armor prevents early termination, no extra damage.
// Ordinary spawn pressure, enemy stats, bosses, skills and the twelve-region clock stay live.
m.hp=m.maxHp=1e6;m.nextScrap=Infinity;
const regions=Object.fromEntries(WORLD_IDS.map(id=>[id,{peakEnemies:0,peakEnemyHp:0,enemySeconds:0,kinds:[]} ]));
for(let frame=0;frame<720*30;frame++){
  const region=regions[m.worldState.id];m.advance(1/30);
  assert.equal(m.phase,'combat');assert.ok(m.enemies.length<=100);
  assert.ok([m.hp,m.shieldHp,m.time,m.scrap,m.kills,m.enemyHealthScale,m.spawnRate].every(Number.isFinite));
  for(const enemy of m.enemies){assert.ok([enemy.x,enemy.y,enemy.hp,enemy.maxHp,enemy.speed].every(Number.isFinite));if(!region.kinds.includes(enemy.kind))region.kinds.push(enemy.kind);region.peakEnemyHp=Math.max(region.peakEnemyHp,enemy.maxHp);}
  region.peakEnemies=Math.max(region.peakEnemies,m.enemies.length);region.enemySeconds+=m.enemies.length/30;
  m.effects.length=0;
}
const entries=m.events.filter(e=>e.type==='region_enter');assert.deepEqual(entries.map(e=>e.value),[...WORLD_IDS.slice(1),'city']);
assert.equal(m.worldState.cycle,1);assert.equal(m.engineState.activations,36);
const hashes=Object.fromEntries(['../assets/scripts/Combat.ts','../assets/scripts/Catalog.ts','../assets/scripts/BuildProgression.ts','../assets/scripts/Locomotives.ts','../assets/scripts/Worlds.ts','./check-world-pressure.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex')]));
const report={scenario:'Controlled 720s soak across twelve regions; seed1; storm core; five specific cars with three actual merges; 1,000,000 starting/max armor prevents early termination; no supply choices. This validates finite pressure, bounds and all region transitions, not survivability or natural build progression.',hashes,regions,entries,world:m.worldState,time:m.time,kills:m.kills,coreActivations:m.engineState.activations,overdrives:m.events.filter(e=>e.type==='build_overdrive').length,bossesKilled:m.events.filter(e=>e.type==='boss_killed').length,damageBySource:m.damageBySource};
const path='artifacts/optimization-20260910/twelve-regions';mkdirSync(path,{recursive:true});writeFileSync(`${path}/world-pressure-smoke.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
