import assert from 'node:assert/strict';
import { Combat, SLOT_Y } from '../assets/scripts/Combat.ts';

function enemy(id=900,x=200,y=40,hp=1000,kind=0){return {id,x,y,hp,maxHp:hp,kind,speed:0,flash:0};}
function addCar(model,type,index){model.phase='supply';model.offers=[{kind:'car',id:type}];assert.equal(model.chooseOffer(0),true);assert.equal(model.install(index),true);assert.equal(model.resumeWorkshop(),true);}
function mod(model,id){model.phase='supply';model.offers=[{kind:'mod',id}];assert.equal(model.chooseOffer(0),true);}
function fixture(types){const model=new Combat();model.start();model.enemies=[];model.spawnClock=-10000;model.nextScrap=Infinity;model.nextModifierTime=Infinity;model.slots=SLOT_Y.map(()=>null);model.carClocks.clear();for(let index=0;index<types.length;index++)if(types[index])addCar(model,types[index],index);return model;}
function noBase(model){for(const clock of model.carClocks.values())clock.cooldown=100;}
function face(model,target){for(let index=0;index<SLOT_Y.length;index++)if(model.slots[index])model.slots[index].angle=model.slots[index].previousAngle=Math.atan2(target.y-SLOT_Y[index],target.x);}
function step(model,n=1){for(let index=0;index<n;index++)model.advance(1/30);}

const independent=fixture(['fan','cannon','prism']);noBase(independent);independent.enemies=[enemy(900,200,-70)];face(independent,independent.enemies[0]);step(independent);
const fanShells=independent.projectiles.filter(projectile=>projectile.recipeId==='cannon-fan');
const prismShells=independent.projectiles.filter(projectile=>projectile.recipeId==='cannon-prism');
assert.equal(fanShells.length,1);assert.equal(fanShells[0].kind,'pierce');
assert.equal(prismShells.length,3);assert.ok(prismShells.every(projectile=>projectile.kind==='cannon'));
assert.ok(independent.effects.some(effect=>effect.type==='parallel-shot'&&effect.recipeId==='cannon-prism'));

const vortex=fixture(['fan','tesla']);noBase(vortex);vortex.enemies=[enemy(900,280,-70)];face(vortex,vortex.enemies[0]);step(vortex);assert.equal(vortex.vortices[0].kind,'electric');
vortex.enemies[0].x=vortex.vortices[0].x+100;vortex.enemies[0].y=vortex.vortices[0].y;
const before=Math.hypot(vortex.enemies[0].x-vortex.vortices[0].x,vortex.enemies[0].y-vortex.vortices[0].y);vortex.moveVortices(1/30);
const after=Math.hypot(vortex.enemies[0].x-vortex.vortices[0].x,vortex.enemies[0].y-vortex.vortices[0].y);assert.ok(after<before,'Electric vortex has a measurable inward pull');

const thermal=fixture(['flame','cryo']);noBase(thermal);thermal.enemies=[{...enemy(900,200,-22.5),slow:2}];face(thermal,thermal.enemies[0]);step(thermal);
assert.ok(thermal.effects.some(effect=>effect.type==='cold-shatter'&&effect.recipeId==='flame-cryo'));
assert.ok(thermal.effects.some(effect=>effect.type==='hit'&&effect.source==='flame-cryo'&&effect.element==='fire'&&effect.damage>=56));
assert.ok(thermal.enemies[0].burn>0,'Accepted thermal shock keeps its fire damage and burn');

const earlyOffers=fixture(['cannon']);earlyOffers.supplyCount=1;earlyOffers.time=30;earlyOffers.supply({kind:'mod',source:'timer',title:'定时改装'});assert.ok(earlyOffers.availableMods().includes(earlyOffers.offers.find(offer=>offer.kind==='mod').id),'Timed reward supplies a valid modifier independently of carriage XP');

const priority=fixture(['cannon']);noBase(priority);priority.bossSpawned=true;priority.enemies=[enemy(900,250,40,1000,3),enemy(901,90,40)];step(priority);
assert.equal(priority.carClocks.get(priority.slots[0].id).targetId,901,'Imminent collision threats preempt a targetable boss');

const boss=fixture(['cannon']);noBase(boss);boss.bossSpawned=true;boss.enemies=[enemy(900,200,40,10,3)];boss.bossClock=boss.bossAttackInterval*.72-1/30;step(boss);
assert.ok(boss.effects.some(effect=>effect.type==='boss-charge'));
boss.bossClock=boss.bossAttackInterval-1/30;step(boss);assert.equal(boss.damageBySource.boss_slam,8);assert.equal(boss.mainDamageSource,'首领冲击');
boss.hit(boss.enemies[0],20,'physical',0,40,undefined,0);
assert.equal(boss.firstStationCleared,true);assert.equal(boss.milestoneSupply,true);assert.ok(boss.effects.some(effect=>effect.type==='milestone'));
step(boss);assert.equal(boss.phase,'supply');assert.equal(boss.nextScrap,Infinity,'Elite reward never consumes carriage XP');
assert.equal(boss.rewardState.source,'elite');assert.ok(boss.offers.every(offer=>offer.kind==='mod'));
assert.ok(boss.events.some(event=>event.type==='supply_offer'&&event.value==='1:elite:mod'));
assert.equal(boss.chooseOffer(0),true);assert.equal(boss.milestoneSupply,false);
boss.nextScrap=8;boss.scrap=8;step(boss,29);assert.equal(boss.phase,'combat');step(boss);
assert.equal(boss.phase,'supply');assert.equal(boss.supplyCount,2);assert.equal(boss.nextScrap,28);assert.equal(boss.rewardState.source,'xp');
assert.ok(boss.offers.every(offer=>offer.kind==='car'),'Queued XP award stays separate from the elite modifier');
const modded=fixture(['cannon']);mod(modded,'scatter');mod(modded,'burst');mod(modded,'rapid');const cannonStats=modded.getCarAttackStats(0);
assert.deepEqual(cannonStats,{damage:26/Math.sqrt(2)*.72,element:'physical',count:2,burst:1,interval:.66*.8,mode:'shot'});
modded.enemies=[enemy(900,200,40)];step(modded);assert.equal(modded.projectiles.length,2);assert.ok(modded.projectiles.every(projectile=>projectile.damage===cannonStats.damage));assert.match(modded.getCarAttackSummary(0),/2发.*2连射/);
const teslaStats=fixture(['tesla']);teslaStats.enemies=[enemy(900,200,40),enemy(901,230,40),enemy(902,260,40),enemy(903,290,40)];step(teslaStats);assert.equal(teslaStats.getCarAttackStats(0).count,3);assert.deepEqual(teslaStats.enemies.map(e=>e.hp),[984,984,984,1000]);assert.match(teslaStats.getCarAttackSummary(0),/至多3目标/);
assert.match(fixture(['repair']).getCarAttackSummary(0),/修复 3/);assert.match(fixture(['shield']).getCarAttackSummary(0),/充盾 12/);

const incoming=fixture(['cannon']);incoming.shieldHp=5;incoming.hp=10;incoming.damageTrain(8,'enemy:1');assert.equal(incoming.hp,7);assert.equal(incoming.damageBySource['enemy:1'],3);assert.equal(incoming.mainDamageSource,'快速敌人撞击');assert.equal(incoming.effects.find(effect=>effect.type==='shield-damage').damage,5);assert.equal(incoming.effects.find(effect=>effect.type==='shield-damage').dx,0,'Shield-break feedback snapshots remaining barrier');assert.equal(incoming.effects.find(effect=>effect.type==='damage').damage,3);
const capped=fixture(['cannon']);capped.enemies=[enemy(900,200,40,10,2)];capped.hit(capped.enemies[0],100,'physical',0,40,undefined,0);assert.equal(capped.effects.find(effect=>effect.type==='hit').damage,10,'Outgoing feedback uses post-resistance damage capped by remaining HP');

const demo=fixture(['cannon']);mod(demo,'rapid');demo.enemies=[];step(demo);assert.equal(demo.enemies.length,0,'Choosing a modifier cannot add unbudgeted enemies');assert.ok(!demo.events.some(event=>event.type==='demonstration_pack'));
for(const type of ['cannon','flame','fan','tesla','cryo','rail','prism','acid','repair','shield'])assert.ok(new Combat().getBaseCarAttackSummary(type).length>0);

const rhythm=new Combat();rhythm.start();assert.equal(rhythm.encounterBeat,'敌群涌入');rhythm.time=20;assert.equal(rhythm.encounterBeat,'密集冲击');rhythm.time=40;assert.equal(rhythm.encounterBeat,'短暂喘息');
console.log('Combat feedback checks passed: independent support projectiles, pull, thermal shatter, threat priority, boss milestone, and wave rhythm.');
