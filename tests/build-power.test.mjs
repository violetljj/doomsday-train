import assert from 'node:assert/strict';
import { Combat, SLOT_Y } from '../assets/scripts/Combat.ts';

const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-7,`${message}: ${actual} != ${expected}`);
const enemy=(id=900,x=200,y=40)=>({id,x,y,hp:1e6,maxHp:1e6,speed:0,kind:0,flash:0});
function fixture(types){
  const m=new Combat();m.start(341);m.enemies=[];m.spawnClock=-1e9;m.nextBossWave=Infinity;m.nextScrap=Infinity;m.nextModifierTime=Infinity;
  m.slots=SLOT_Y.map(()=>null);m.carClocks.clear();
  m.openWorkshop();
  types.forEach((type,i)=>{if(type){m.pendingCar=type;assert.equal(m.install(i),true);}});
  m.resumeWorkshop();return m;
}
function step(m,count=1,speed=1){for(let i=0;i<count;i++)m.advance(1/30,speed);}
function face(m,e){m.slots.forEach((car,i)=>{if(car)car.angle=car.previousAngle=Math.atan2(e.y-SLOT_Y[i],e.x);});}
function quiet(m){for(const clock of m.carClocks.values())clock.cooldown=1e6;}
function matureFire(){const m=fixture(['cannon','cannon','cannon','repair','shield']);m.slots[0].level=3;m.kills=100;quiet(m);return m;}

// Branch passives change attacks at their origin, never after launch.
const fire=fixture(['cannon','cannon','cannon','repair','shield']);fire.enemies=[enemy()];face(fire,fire.enemies[0]);step(fire);
near(fire.projectiles.find(p=>p.carSlot===0&&!p.recipeId).damage,26*1.05,'Three guns activate actual damage');
near(fire.getCarAttackStats(0).damage,26*1.05,'Displayed stats describe actual boosted shots');
const old=fire.projectiles[0],oldDamage=old.damage;
fire.openWorkshop();fire.pendingCar='repair';fire.install(2);fire.resumeWorkshop();
near(fire.buildPower.weaponDamageMultiplier,1,'Removing the branch removes its passive');
near(old.damage,oldDamage,'Existing projectile retains damage after branch removal');

const linked=fixture(['cannon','fan','flame','cryo','rail']);quiet(linked);linked.enemies=[enemy(900,200,-180)];face(linked,linked.enemies[0]);step(linked);
near(linked.projectiles.find(p=>p.recipeId==='cannon-fan').damage,36*1.15,'Full circuit has real +15% link damage');
assert.equal(linked.buildProgression.metrics.linkActivations,4);
assert.equal(linked.events.filter(e=>e.type==='combo_discovered').length,4);
step(linked,60);
assert.ok(linked.buildProgression.metrics.linkActivations>4,'Repeated actual firing counts beyond discoveries');
assert.equal(linked.events.filter(e=>e.type==='combo_discovered').length,4);
assert.equal(linked.buildPower.overdrive.eligible,false,'A new full circuit still needs battle experience');

const support=fixture(['repair','cannon','shield','fan']);support.hp=40;support.enemies=[enemy(900,150,-70)];face(support,support.enemies[0]);quiet(support);
support.carClocks.get(support.slots[0].id).cooldown=0;support.carClocks.get(support.slots[2].id).cooldown=0;step(support);
near(support.hp,40+5*1.15,'Base and linked repair both scale');
near(support.shieldHp,16*1.15,'Base and linked shielding both scale');
near(support.projectiles.find(p=>p.recipeId==='cannon-repair').damage,18*1.18*1.15,'Support branch enhances supplied attacks');
support.slots[0].level=10;support.carClocks.get(support.slots[0].id).cooldown=0;const beforeHeal=support.hp;step(support);
near(support.hp-beforeHeal,13*1.15,'Support levels retain late growth with branch bonuses');
const control=fixture(['fan','cryo','acid']);control.enemies=[enemy(900,120,-110)];face(control,control.enemies[0]);step(control);
near(control.enemies[0].slow,1.8*1.05,'Support controls receive the bonus');
near(control.enemies[0].corrosion,3*1.05,'Corrosion duration receives the bonus');

const salvage=fixture(['cannon']);salvage.supplyCount=1;
for(let i=0;i<20;i++){const target={...enemy(i),hp:1};salvage.hit(target,1,'physical',0,40);}
assert.equal(salvage.kills,20);assert.equal(salvage.scrap,21,'Fractional salvage accumulates into integer scrap');

// Charging advances only while eligible in combat; opening menus and rearranging never refills it.
const drive=matureFire();step(drive,270);near(drive.buildPower.overdrive.cooldown,9,'Half charged');
drive.pause();const paused=JSON.stringify(drive.buildPower);drive.advance(.1,4);assert.equal(JSON.stringify(drive.buildPower),paused);
drive.openWorkshop();drive.swapSlots(0,1);drive.swapSlots(1,0);drive.resumeWorkshop();near(drive.buildPower.overdrive.cooldown,9,'Moves retain charge');
step(drive,270);assert.equal(drive.buildPower.overdrive.active,true);near(drive.buildPower.overdrive.remaining,4,'Activation lasts four combat seconds');
assert.equal(drive.events.filter(e=>e.type==='build_overdrive').length,1);
near(drive.buildPower.weaponDamageMultiplier,1.65,'Fire overdrive stacks on the equipped permanent branch');
near(drive.buildPower.attackRateMultiplier,1.25,'Fire overdrive accelerates existing cooldowns');
drive.enemies=[enemy(900,500,40)];face(drive,drive.enemies[0]);drive.slots[0].mods.burst=1;drive.carClocks.get(drive.slots[0].id).cooldown=0;step(drive);
const burstDamage=26*(1+3*.35)*.72*1.65;near(drive.burstQueue[0].damage,burstDamage,'Queued bursts capture overdrive damage');
const gunClock=drive.carClocks.get(drive.slots[0].id),clockBefore=gunClock.cooldown;step(drive);
near(clockBefore-gunClock.cooldown,1.25/30,'Actual gun clock accelerates');
drive.openWorkshop();drive.pendingCar='fan';drive.install(2);drive.resumeWorkshop();
assert.equal(drive.buildIdentity,'全域支援');assert.equal(drive.buildPower.overdrive.active,false,'A different branch cannot borrow the active power');
near(drive.buildPower.weaponDamageMultiplier,1,'The old branch does not stack after replacement');
step(drive,4);assert.ok(drive.projectiles.some(p=>Math.abs(p.damage-burstDamage)<1e-7),'Delayed burst keeps its original buff after a branch change');

const chainDrive=fixture(['cannon','fan','flame','cryo','rail']);quiet(chainDrive);chainDrive.time=30;
chainDrive.seedSeenRecipes(['cannon-fan','flame-fan','flame-cryo']);chainDrive.linkActivationCount=24;
step(chainDrive,540);assert.equal(chainDrive.buildPower.overdrive.active,true);
near(chainDrive.buildPower.linkDamageMultiplier,1.75,'Mature chain overdrive adds real link damage');
chainDrive.enemies=[enemy(900,200,-180)];face(chainDrive,chainDrive.enemies[0]);step(chainDrive);
near(chainDrive.projectiles.find(p=>p.recipeId==='cannon-fan').damage,36*1.75,'Overdriven linked shot captures the actual boosted damage');
const link=chainDrive.links[0],key=chainDrive.linkKey(link.index,link.recipe);chainDrive.linkClocks.set(key,1);step(chainDrive);
near(chainDrive.linkClocks.get(key),1-1.35/30,'Chain overdrive accelerates retained pair cooldowns');

const escort=fixture(['repair','cannon','shield','fan']);quiet(escort);escort.time=60;escort.hp=40;escort.passiveRepairClock=-1e9;
step(escort,540);assert.equal(escort.buildPower.overdrive.active,true);const pulseHp=escort.hp,pulseShield=escort.shieldHp;
step(escort,90);near(escort.hp-pulseHp,3,'Three later timed repair pulses');near(escort.shieldHp-pulseShield,6,'Three later shield pulses');
step(escort,30);assert.equal(escort.buildPower.overdrive.active,false);near(escort.buildPower.overdrive.cooldown,18,'A spent pulse cannot immediately retrigger');
const immature=fixture(['cannon','cannon','cannon']);quiet(immature);step(immature,600);
near(immature.buildPower.overdrive.cooldown,18,'An immature branch cannot precharge');
assert.equal(immature.buildPower.overdrive.active,false);

function run(speed){const m=matureFire();step(m,30*66/speed,speed);return {time:m.time,events:m.events,power:m.buildPower,hp:m.hp,shield:m.shieldHp};}
assert.deepEqual(run(1),run(2));assert.deepEqual(run(1),run(4),'Overdrive cadence is deterministic across game speeds');
const reset=matureFire();step(reset,550);reset.start(341);const fresh=new Combat();fresh.start(341);
assert.deepEqual(reset.buildPower,fresh.buildPower);assert.equal(reset.buildProgression.metrics.linkActivations,0);
assert.equal(reset.buildProgression.metrics.bossKills,0);
console.log('Build power: live attacks, repair/shields, controls, late upgrades, integer salvage, charge/pause/swap protection, burst snapshots, three overdrives and deterministic reset passed.');

// A central weapon combines two supports' ammunition, beyond its existing +18% link bonus.
const iceBattery=fixture(['cryo','rail','prism']);quiet(iceBattery);
iceBattery.enemies=[enemy(950,450,-70)];face(iceBattery,iceBattery.enemies[0]);step(iceBattery);
const iceBeams=iceBattery.projectiles.filter(p=>p.recipeId==='rail-prism');
assert.equal(iceBeams.length,3);
assert.ok(iceBeams.every(p=>p.freeze===.65&&p.slow===2),'All prism beams carry adjacent cryo ammunition');
assert.match(iceBattery.getCarSynergySummary(1),/联动弹共享冻结/);
step(iceBattery);
assert.ok(iceBattery.enemies[0].freeze>0,'The composed beam actually freezes a distant target');

const acidBattery=fixture(['acid','cannon','fan']);quiet(acidBattery);
acidBattery.enemies=[{...enemy(951,450,-70),kind:2}];face(acidBattery,acidBattery.enemies[0]);
// Isolate the fan recipe: the acid weapon's separate shot cannot supply the debuff for this test.
assert.equal(acidBattery.triggerLink(1,acidBattery.links[1].recipe),true);
const corrosive=acidBattery.projectiles.find(p=>p.recipeId==='cannon-fan');
assert.equal(corrosive.corrosion,3);
const predicted=corrosive.damage;
acidBattery.openWorkshop();acidBattery.pendingCar='repair';acidBattery.install(0);acidBattery.resumeWorkshop();
assert.equal(acidBattery.getCarSynergySummary(1),'');
assert.equal(corrosive.corrosion,3,'Removing the support cannot alter a flying round');
const armored=acidBattery.enemies[0];
for(let i=0;i<30&&!corrosive.hitIds.length;i++)acidBattery.moveProjectiles(1/30);
near(1e6-armored.hp,predicted,'Shared acid bypasses armor before fan-pierce damage');
assert.equal(armored.corrosion,3);

const iceShells=fixture(['cryo','cannon','prism']);quiet(iceShells);
iceShells.enemies=[enemy(952,300,-70),enemy(953,300,-50)];face(iceShells,iceShells.enemies[0]);
iceShells.triggerLink(1,iceShells.links[1].recipe);
for(let i=0;i<30&&!iceShells.enemies[0].freeze;i++)iceShells.moveProjectiles(1/30);
assert.ok(iceShells.enemies.every(e=>e.freeze>0),'Shared cryo affects the cannon splash area');
const separated=fixture(['cryo','rail',null,'prism']);assert.equal(separated.getCarSynergySummary(1),'');
const single=fixture(['rail','prism']);quiet(single);single.enemies=[enemy()];face(single,single.enemies[0]);step(single);
assert.ok(single.projectiles.filter(p=>p.recipeId).every(p=>!p.freeze&&!p.corrosion),'Single support recipes do not inherit distant or missing payloads');
console.log('Crossfeed: prism freezing beams/splash, armor-breaking fan rounds, adjacency removal and projectile snapshots passed.');
