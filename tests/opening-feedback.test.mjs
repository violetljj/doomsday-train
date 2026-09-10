import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';

// Controlled collinear targets: counts must come from a single physical projectile.
const m=new Combat();m.start();m.openWorkshop();m.pendingCar='fan';m.install(1);m.resumeWorkshop();
m.enemies=[200,250,300].map((x,i)=>({id:900+i,x,y:40,hp:1000,maxHp:1000,speed:0,kind:0,flash:0}));
m.spawnClock=-1000;m.nextScrap=Infinity;m.nextModifierTime=Infinity;
for(const clock of m.carClocks.values())clock.cooldown=100;
m.slots[0].angle=m.slots[0].previousAngle=0;
for(let i=0;i<20;i++)m.advance(1/30);
const impacts=m.effects.filter(e=>e.type==='pierce-hit');
assert.deepEqual(impacts.map(e=>e.size),[1,2,3]);
assert.equal(new Set(impacts.map(e=>e.source)).size,1);
assert.ok(impacts.every(e=>e.recipeId==='cannon-fan'&&e.carSlot===0));
assert.deepEqual(m.events.filter(e=>e.type==='pierce_chain').map(e=>Number(e.value.split(':')[1])),[2,3]);
assert.ok(m.effects.find(e=>e.type==='link-feed'&&e.recipeId==='cannon-fan'));
m.pause();const frozen=JSON.stringify(m);m.advance(.1,4);assert.equal(JSON.stringify(m),frozen);

// A natural seeded opening measures the real first-minute path, without scripted enemies.
const run=new Combat();run.start(137);
while(run.time<60&&run.phase!=='lose'){
  if(run.phase==='supply'){
    const fan=run.offers.findIndex(offer=>offer.kind==='car'&&offer.id==='fan');
    assert.equal(run.chooseOffer(fan>=0?fan:0),true,'Every queued reward offers a valid choice');
  } else if(run.phase==='workshop'){
    if(run.pendingCar){
      const duplicate=run.slots.findIndex(car=>car?.type===run.pendingCar);
      if(duplicate>=0)run.mergePending(duplicate);
      else {const empty=run.slots.indexOf(null);if(empty>=0)run.install(empty);else run.discardOffer();}
    }
    // Keep the earned fan beside the cannon regardless of reward order.
    const fanSlot=run.slots.findIndex(car=>car?.type==='fan');
    if(fanSlot>1)assert.equal(run.swapSlots(fanSlot,1),true);
    run.resumeWorkshop();
  } else run.advance(.1);
}
const chains=run.events.filter(e=>e.type==='pierce_chain');
assert.ok(chains.length>0,'Seed 137 opening produces an actual multi-target piercing hit within the first minute');
assert.ok(run.events.some(event=>event.type==='supply_offer'&&event.value.endsWith(':timer:mod')),'Opening earns a timed modifier without spending its carriage XP');
console.log(JSON.stringify({checks:'single projectile hit count, real source, freeze, natural opening',firstChain:chains[0],stations:run.stationCount,time:run.time,hp:run.hp}));
