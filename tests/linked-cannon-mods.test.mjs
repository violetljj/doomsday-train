import assert from 'node:assert/strict';
import {Combat,SLOT_Y} from '../assets/scripts/Combat.ts';
function setup(support,mods={}){
 const m=new Combat();m.start();m.enemies=[];m.spawnClock=-10000;m.nextModifierTime=Infinity;m.nextScrap=Infinity;
 m.openWorkshop();m.pendingCar=support;assert.ok(m.install(1));m.resumeWorkshop();m.slots[0].mods={...mods};
 m.enemies=[{id:900,x:200,y:40,hp:10000,maxHp:10000,kind:0,speed:0,flash:0}];m.slots[0].angle=0;
 m.hp=50;assert.ok(m.triggerLink(0,m.links[0].recipe));return m;
}
for(const support of ['fan','cryo','acid','prism','repair','shield']){
 const baseline=setup(support),m=setup(support,{scatter:2,burst:2});
 assert.equal(m.projectiles.length,baseline.projectiles.length*3);assert.ok(m.projectiles.length<=9);
 assert.equal(m.burstQueue.length,m.projectiles.length*2);
 assert.equal(m.hp,baseline.hp,'Healing once per activation');assert.equal(m.shieldHp,baseline.shieldHp,'Shield once per activation');
 assert.equal(m.linkActivationCount,1);
 for(const [i,p] of m.projectiles.entries()){
  const b=baseline.projectiles[Math.floor(i/3)];
  assert.ok(Math.abs(p.damage-b.damage*.6/Math.sqrt(3))<1e-8);
  for(const key of ['kind','element','recipeId','slow','freeze','corrosion','frozenBonus'])assert.equal(p[key],b[key],`${support} ${key}`);
 }
 assert.equal(new Set(m.projectiles.map(p=>p.id)).size,m.projectiles.length);
 const snap=m.burstQueue[0].payload;assert.notEqual(snap,m.projectiles[0]);assert.notEqual(snap.hitIds,m.projectiles[0].hitIds);
}
const moved=setup('cryo',{scatter:1,burst:1});const expected=moved.burstQueue.map(s=>({...s.payload}));
moved.pause();const timers=moved.burstQueue.map(s=>s.delay);moved.advance(1,4);assert.deepEqual(moved.burstQueue.map(s=>s.delay),timers);moved.resume();
moved.openWorkshop();assert.ok(moved.swapSlots(0,3));moved.resumeWorkshop();moved.slots[3].mods={};
moved.projectiles=[];moved.updateCar=()=>{};moved.triggerLink=()=>false;
for(let i=0;i<4;i++)moved.advance(1/30);
assert.equal(moved.projectiles.length,2);assert.ok(moved.projectiles.every(p=>p.carSlot===3&&p.freeze===1.3&&p.kind==='shatter'));
assert.equal(moved.projectiles[0].damage,expected[0].damage,'Delayed damage locked before mod change');
assert.ok(moved.projectiles.every(p=>Math.abs(p.y-SLOT_Y[3])<40),'Delayed volley originates from moved owner');
const replaced=setup('acid',{burst:2});replaced.openWorkshop();for(let i=2;i<5;i++){replaced.pendingCar='fan';replaced.install(i);}replaced.pendingCar='flame';replaced.install(0);assert.equal(replaced.burstQueue.length,0,'Scrapping owner cancels delayed linked shots');
const hit=setup('cryo',{burst:1});hit.projectiles=hit.projectiles.slice(0,1);for(let i=0;i<30;i++)hit.moveProjectiles(1/30);assert.ok(hit.enemies[0].hp<10000&&hit.enemies[0].freeze>0,'Modified linked payload applies on actual collision');
console.log('Linked cannon mods: all six supports, limits, damage, payloads, one-time recovery, pause, move, replacement and hit passed.');

const shared=setup('cryo',{scatter:2,burst:1});shared.openWorkshop();shared.pendingCar='acid';shared.install(0);shared.resumeWorkshop();shared.slots[1].angle=Math.atan2(110,200);shared.projectiles=[];shared.burstQueue=[];assert.ok(shared.triggerLink(1,shared.links.find(l=>l.recipe.id==='cannon-cryo').recipe));
assert.equal(shared.projectiles.length,3);assert.ok(shared.projectiles.every(p=>p.freeze>0&&p.corrosion>0));assert.ok(shared.burstQueue.every(s=>s.payload.freeze>0&&s.payload.corrosion>0),'Both supports survive immediate and delayed scatter');
