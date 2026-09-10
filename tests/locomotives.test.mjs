import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { ENGINE_IDS, ENGINES, MODULES, normalizeLoadout } from '../assets/scripts/Locomotives.ts';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const step=(m,count=1,speed=1)=>{for(let i=0;i<count;i++)m.advance(1/30,speed);};
const enemy=(id,x=200,y=145)=>({id,x,y,hp:1000,maxHp:1000,speed:0,kind:0,flash:0});
function isolated(engine,module='none'){
  const m=new Combat();m.start(914,false,{engine,module});m.enemies=[];m.spawnClock=-1e9;m.nextBossWave=Infinity;m.nextScrap=Infinity;m.nextModifierTime=Infinity;
  m.passiveRepairClock=-1e9;
  for(const clock of m.carClocks.values())clock.cooldown=1e9;
  return m;
}
for(const invalid of [null,undefined,3,'storm',{},[],{engine:'constructor',module:'__proto__'},{engine:{},module:[]}])assert.deepEqual(normalizeLoadout(invalid),{engine:'dawn',module:'none'});
assert.deepEqual(normalizeLoadout({engine:'storm',module:'capacitor',arbitrary:true}),{engine:'storm',module:'capacitor'});
assert.equal(Object.keys(MODULES).length,4);
for(const engine of ENGINE_IDS){
  const m=new Combat(),loadout={engine,module:'none'};m.start(914,true,loadout);
  assert.equal(m.slots[0].type,ENGINES[engine].starter);assert.equal(m.slots.length,5);
  assert.equal(m.slots.filter(Boolean).length,1);assert.equal(m.engineState.id,engine);
  assert.equal(m.engineState.activations,0);assert.equal(m.engineState.cooldown,20);
  assert.equal(m.advance(.1,4),0);assert.equal(m.engineState.cooldown,20,'Arrival holds the core clock');
  loadout.engine='invalid';const copy=m.runLoadout;copy.engine='invalid';assert.equal(m.engineState.id,engine,'Caller mutation cannot change an active engine');
  m.startEncounter();m.pause();assert.equal(m.advance(.1,4),0);assert.equal(m.engineState.cooldown,20);
}
const dawn=isolated('dawn');step(dawn,599);assert.equal(dawn.engineState.activations,0);
dawn.enemies=[enemy(900)];step(dawn);assert.equal(dawn.engineState.activations,1);near(dawn.engineState.cooldown,20);
assert.equal(dawn.projectiles.length,3);assert.ok(dawn.projectiles.every(p=>p.source==='engine:dawn'&&p.damage===18&&p.carSlot===undefined));
for(const p of dawn.projectiles)near(p.y-p.dy/30,145);
const initialDamage=dawn.projectiles.map(p=>p.damage);dawn.slots[0].level=9;dawn.linkLevel=9;
assert.deepEqual(dawn.projectiles.map(p=>p.damage),initialDamage,'Head volley damage is a creation-time snapshot');
step(dawn,20);assert.ok(dawn.enemies[0].hp<1000,'Head shells produce real impact damage');
assert.ok(dawn.effects.some(e=>e.type==='hit'&&e.source==='engine:dawn'));
const spent=dawn.engineState.cooldown;dawn.openWorkshop();dawn.swapSlots(0,4);dawn.resumeWorkshop();near(dawn.engineState.cooldown,spent);
const emptyDawn=isolated('dawn');step(emptyDawn,600);assert.ok(emptyDawn.projectiles.every(p=>p.dy>0),'Without a target the head fires forward');

const storm=isolated('storm');storm.enemies=[enemy(900,150),enemy(901,-200),enemy(902,300),enemy(903,400),enemy(904,700)];step(storm,600);
assert.deepEqual(storm.enemies.map(e=>e.hp),[980,980,980,1000,1000]);
assert.equal(storm.effects.filter(e=>e.type==='hit'&&e.source==='engine:storm').length,3);
assert.equal(storm.engineState.activations,1);
const haven=isolated('haven');haven.hp=50;step(haven,600);near(haven.hp,53);near(haven.shieldHp,12);
haven.hp=99;haven.shieldHp=23;step(haven,600);near(haven.hp,100);near(haven.shieldHp,24);
assert.equal(haven.engineState.activations,2);

const plated=isolated('haven','plating');assert.equal(plated.maxHp,115);assert.equal(plated.hp,115);plated.hp=114;step(plated,600);assert.equal(plated.hp,115);
const shielded=isolated('dawn','capacitor');assert.equal(shielded.maxShield,32);assert.equal(shielded.shieldHp,8);shielded.damageTrain(10);assert.equal(shielded.hp,98);assert.equal(shielded.shieldHp,0);
const salvager=isolated('dawn','salvager');for(let i=0;i<10;i++){const e={...enemy(i),hp:1};salvager.hit(e,1,'physical',0,145);}assert.equal(salvager.scrap,11);
salvager.supplyCount=1;for(let i=0;i<20;i++){const e={...enemy(100+i),hp:1};salvager.hit(e,1,'physical',0,145);}assert.ok(salvager.scrap>=34,'Branch and module salvage bonuses share an integer accumulator');

for(const engine of ENGINE_IDS){
  function run(speed){const m=isolated(engine,'plating');m.hp=70;step(m,1800/speed,speed);return {time:m.time,hp:m.hp,shield:m.shieldHp,engine:m.engineState,shots:m.projectiles,events:m.events};}
  assert.deepEqual(run(1),run(2));assert.deepEqual(run(1),run(4));
  const reset=isolated(engine,'capacitor');step(reset,620);reset.start(914,false,{engine,module:'plating'});
  const fresh=new Combat();fresh.start(914,false,{engine,module:'plating'});
  const {revision:ra,...a}=reset,{revision:rb,...b}=fresh;assert.deepEqual(a,b,'Restart clears engine clocks, shots and previous module');
}
const legacy=new Combat();legacy.start(914);assert.equal(legacy.engineState,null);assert.equal(legacy.runLoadout,null);assert.equal(legacy.slots[0].type,'cannon');
const resetLegacy=isolated('haven','plating');resetLegacy.start(914);const {revision:ra,...a}=resetLegacy,{revision:rb,...b}=legacy;assert.deepEqual(a,b,'Omitting loadout preserves legacy behavior and removes prior module');
console.log('Locomotives passed: three real cores, source/shot snapshots, starts/modules, timer/arrival/pause/swap freeze, immutable loadout, reset, legacy and 1/2/4 determinism.');
