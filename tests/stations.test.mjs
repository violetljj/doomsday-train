import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { renderPanel } from '../assets/scripts/PanelRenderer.ts';

function station(seed = 137) {
  const m = new Combat(); m.start(seed); m.supplyCount = 1; m.hp = 65; m.nextModifierTime=Infinity; m.supply();
  // Legacy route fixture: normal rewards no longer force a route choice.
  m.offers=[{kind:'car',id:'fan'},{kind:'mod',id:'caliber'},{kind:'repair',id:'repair',amount:30}];m.stationChoices=true;m.stationCount=1;
  return m;
}
const m = station();
assert.equal(m.stationCount, 1);
assert.deepEqual(m.offers.map(o => o.kind), ['car', 'mod', 'repair']);
const frozen = JSON.stringify(m); m.advance(.1, 4); assert.equal(JSON.stringify(m), frozen);
assert.equal(m.chooseOffer(-1), false); assert.equal(m.stationChoices, true);
const labels = [], hits = [], noop = () => {};
renderPanel({model:m,knownRecipes:new Set(),newRecipes:new Set(),atlas:false,atlasPage:0,atlasCars:false,selectedSlot:-1,
  actions:{chooseOffer:i=>m.chooseOffer(i)},draw:{rect:noop,line:noop,circle:noop,cardIcon:noop,button:noop,
    label:text=>labels.push(text),addHitArea:(x,y,w,h,action)=>hits.push(action)}});
for (const name of ['应急维修','风扇车','扩膛弹药']) assert.ok(labels.includes(name));
assert.ok(!labels.some(s=>s.includes('双血量重甲怪')),'Reward UI no longer advertises a forced route penalty');
hits[2](); assert.equal(m.hp,95); assert.equal(m.route,'repair'); assert.equal(m.phase,'combat');
assert.equal(m.chooseOffer(2),false);

const cargo=station(); cargo.chooseOffer(0);
assert.equal(cargo.phase,'workshop'); assert.equal(cargo.route,'cargo');
const before=cargo.time; cargo.advance(.1,4); assert.equal(cargo.time,before);
cargo.install(1); cargo.resumeWorkshop(); cargo.enemies=[]; cargo.nextScrap=Infinity;
for(let i=0;i<60;i++)cargo.advance(.1);
assert.ok(cargo.events.some(e=>e.type==='route_reinforcement'));
cargo.supply({kind:'mod',source:'timer',title:'定时改装'}); assert.equal(cargo.route,null); assert.equal(cargo.stationCount,2);
cargo.chooseOffer(0); const count=cargo.events.filter(e=>e.type==='route_reinforcement').length;
cargo.nextScrap=Infinity; for(let i=0;i<30;i++)cargo.advance(.1);
assert.equal(cargo.events.filter(e=>e.type==='route_reinforcement').length,count);

const military=station(); const old=JSON.stringify(military.slots); military.chooseOffer(1);
assert.notEqual(JSON.stringify(military.slots),old); assert.equal(military.route,'arsenal');
military.nextScrap=Infinity; military.spawnClock=-1000; military.enemies=[];
military.pause(); military.advance(.1,4); assert.equal(military.time,0); military.resume();
for(let i=0;i<30;i++)military.advance(.1);
assert.equal(military.events.filter(e=>e.type==='route_escort').length,1);
const escort=military.enemies.find(e=>e.kind===2); assert.ok(escort); assert.equal(escort.maxHp,96);
for(let i=0;i<30;i++)military.advance(.1);
assert.equal(military.events.filter(e=>e.type==='route_escort').length,1);
military.start(); assert.equal(military.route,null); assert.equal(military.stationChoices,false); assert.equal(military.stationCount,0);
military.supply(); assert.equal(military.stationChoices,false); assert.ok(military.offers.every(o=>o.kind==='car'));
const healthy=station();healthy.hp=100;healthy.chooseOffer(2);assert.equal(healthy.hp,100);
assert.deepEqual(station(39).offers,station(39).offers);
console.log('Station checks passed: three rewards, panel actions, frozen workshop, cargo reinforcements, delayed double-health escort, route replacement and reset.');
