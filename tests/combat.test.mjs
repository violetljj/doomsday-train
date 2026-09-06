import assert from 'node:assert/strict';
import { Combat, SLOT_Y } from '../assets/scripts/Combat.ts';
import { CAR_TYPES, CARS, MODS, RECIPES, getRecipe } from '../assets/scripts/Catalog.ts';

function enemy(id=900,x=200,y=40,hp=1000,kind=0){return {id,x,y,hp,maxHp:hp,kind,speed:0,flash:0};}
function carOffer(m,type,index){m.phase='supply';m.offers=[{kind:'car',id:type}];assert.equal(m.chooseOffer(0),true);assert.equal(m.install(index),true);assert.equal(m.resumeWorkshop(),true);}
function fixture(types=['cannon']){
 const m=new Combat();m.start();m.enemies=[];m.spawnClock=-10000;m.supplyCount=6;m.nextScrap=Infinity;
 for(let i=0;i<types.length;i++)if(types[i])carOffer(m,types[i],i);
 return m;
}
function noBase(m){for(const clock of m.carClocks.values())clock.cooldown=100;}
function face(m,target){for(let i=0;i<4;i++)if(m.slots[i])m.slots[i].angle=m.slots[i].previousAngle=Math.atan2(target.y-SLOT_Y[i],target.x);}
function step(m,n=1,speed=1){for(let i=0;i<n;i++)m.advance(1/30,speed);}
const arc=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const singleVortex=(id,x,y)=>({id,x,y,dx:0,dy:0,life:10,maxLife:10,age:0,radius:76,tick:100,damage:13,kind:'fire',element:'fire'});
const shell=(id,kind='cannon',extra={})=>({id,x:190,y:40,dx:390,dy:0,life:2,radius:12,kind,damage:30,element:'physical',hitIds:[],...extra});

assert.equal(CAR_TYPES.length,5);assert.equal(Object.keys(MODS).length,6);assert.equal(RECIPES.length,11);
const pairIds=new Set();
for(const a of CAR_TYPES){assert.ok(CARS[a].name&&CARS[a].color);assert.equal(getRecipe(a,a),null);for(const b of CAR_TYPES)if(a!==b){const r=getRecipe(a,b);assert.ok(r,`${a}/${b} needs a real recipe`);pairIds.add(r.id);if(!r.directional)assert.equal(getRecipe(b,a).id,r.id);}}
assert.equal(pairIds.size,11);assert.notEqual(getRecipe('flame','fan').id,getRecipe('fan','flame').id);

// All five independent car actions work without an adjacent partner.
const cannon=fixture();cannon.enemies=[enemy()];step(cannon);assert.equal(cannon.projectiles[0].kind,'cannon');step(cannon,20);assert.ok(cannon.enemies[0].hp<1000);
const flame=fixture(['flame']);flame.enemies=[enemy()];step(flame);assert.equal(flame.enemies[0].hp,994);assert.ok(flame.effects.some(e=>e.type==='flame'&&e.carSlot===0));
const fan=fixture(['fan']);fan.enemies=[enemy()];step(fan);assert.equal(fan.enemies[0].hp,1000);assert.ok(fan.enemies[0].x>200,'Fan only pushes, without fake damage or kills');assert.equal(fan.scrap,0);
const tesla=fixture(['tesla']);tesla.enemies=[200,250,300,350].map((x,i)=>enemy(900+i,x));step(tesla);assert.deepEqual(tesla.enemies.map(e=>e.hp),[984,984,984,1000]);
const cryo=fixture(['cryo']);cryo.enemies=[enemy(900,200),enemy(901,300)];step(cryo);assert.equal(cryo.enemies[0].hp,990);assert.ok(cryo.enemies[0].slow>0);assert.equal(cryo.enemies[1].hp,1000);
const slowed=fixture(),normal=fixture();noBase(slowed);noBase(normal);slowed.enemies=[{...enemy(),speed:60,slow:1}];normal.enemies=[{...enemy(),speed:60}];step(slowed);step(normal);assert.equal(200-slowed.enemies[0].x,(200-normal.enemies[0].x)/2);

// Independent slot origins, smooth shortest-arc tracking, lock hysteresis and real muzzle paths.
const origins=fixture(['cannon','cannon','cannon','cannon']);origins.enemies=[enemy(900,200,200)];face(origins,origins.enemies[0]);step(origins);
assert.equal(origins.projectiles.length,4);for(const p of origins.projectiles){const car=origins.slots[p.carSlot];assert.ok(Math.abs(arc(car.angle,Math.atan2(p.dy,p.dx)))<1e-10);assert.ok(Math.abs(p.y-p.dy/30-SLOT_Y[p.carSlot])<1e-10);}
const turning=fixture();noBase(turning);turning.enemies=[enemy(900,Math.cos(-179*Math.PI/180)*230,40+Math.sin(-179*Math.PI/180)*230)];turning.slots[0].angle=179*Math.PI/180;
const oldAngle=turning.slots[0].angle;step(turning);const angle=turning.slots[0].angle;assert.ok(arc(oldAngle,angle)>0&&arc(oldAngle,angle)<2*Math.PI/180);
assert.ok(Math.abs(arc(oldAngle,turning.getRenderAngle(0)))<1e-10);assert.equal(turning.advance(1/60),0);assert.ok(Math.abs(arc(oldAngle,turning.getRenderAngle(0))-arc(oldAngle,angle)/2)<1e-10);
turning.pause();assert.equal(turning.advance(.1,4),0);turning.resume();assert.equal(turning.getRenderAngle(0),angle,'Resume cannot jump to the previous angle');
const lock=fixture();noBase(lock);lock.enemies=[enemy(900,200),enemy(901,-205)];step(lock);lock.enemies[0].x=202;lock.enemies[1].x=-198;step(lock);assert.ok(Math.abs(lock.slots[0].angle)<.01);lock.enemies[1].x=-90;step(lock);assert.ok(Math.abs(lock.slots[0].angle)>0&&Math.abs(lock.slots[0].angle)<=10/30+.00001);
const wait=fixture();wait.enemies=[enemy(900,-230)];step(wait);assert.equal(wait.projectiles.length,0);step(wait,20);assert.ok(wait.projectiles.length>0,'Muzzle aligns before firing across the train');

// Workshop ownership, adjacency, direction, empty slots and disposal are real state transitions.
const layout=fixture(['flame','fan','tesla']);assert.deepEqual(layout.links.map(l=>l.recipe.id),['flame-fan','fan-tesla']);assert.equal(layout.links.length,2);assert.equal(layout.seenRecipes.size,0);
assert.equal(layout.swapSlots(0,1),false);layout.openWorkshop();const frozenLayout=JSON.stringify({time:layout.time,slots:layout.slots});assert.equal(layout.advance(.1,4),0);assert.equal(JSON.stringify({time:layout.time,slots:layout.slots}),frozenLayout);
layout.swapSlots(0,1);assert.deepEqual(layout.links.map(l=>l.recipe.id),['fan-flame','flame-tesla']);layout.swapSlots(1,3);assert.deepEqual(layout.links.map(l=>l.index),[2]);assert.equal(layout.links[0].recipe.id,'flame-tesla','An empty middle slot cannot transmit a link');
assert.equal(layout.install(-1),false);layout.pendingCar='cryo';assert.equal(layout.resumeWorkshop(),false);assert.equal(layout.install(9),false);assert.equal(layout.discardOffer(),true);assert.equal(layout.discardOffer(),false);assert.equal(layout.resumeWorkshop(),true);
const pending=fixture();pending.phase='supply';pending.offers=[{kind:'car',id:'flame'}];assert.equal(pending.chooseOffer(1),false);assert.equal(pending.chooseOffer(0),true);assert.equal(pending.chooseOffer(0),false);assert.equal(pending.offers.length,0);const removed=pending.slots[0].id;pending.install(0);assert.notEqual(pending.slots[0].id,removed);assert.equal(pending.slots[0].type,'flame');assert.equal(pending.install(0),false);assert.equal(pending.phase,'workshop');pending.resumeWorkshop();
const changed=fixture(['flame','fan']);noBase(changed);changed.enemies=[enemy()];face(changed,changed.enemies[0]);step(changed);assert.equal(changed.seenRecipes.size,1);assert.ok(changed.vortices.length);changed.effects=[];changed.vortices=[];changed.openWorkshop();changed.swapSlots(1,3);changed.resumeWorkshop();step(changed,40);assert.equal(changed.links.length,0);assert.ok(!changed.effects.some(e=>e.type==='fire-vortex'),'An old edge must stop triggering after a swap');
carOffer(changed,'cannon',0);assert.equal(changed.slots[0].type,'cannon');assert.equal(changed.links.length,0);

const cooldown=fixture(['flame','fan']);noBase(cooldown);cooldown.enemies=[enemy()];face(cooldown,cooldown.enemies[0]);step(cooldown);
const pairKey=[...cooldown.linkClocks.keys()][0], remaining=cooldown.linkClocks.get(pairKey);assert.ok(remaining>1);
cooldown.effects=[];cooldown.vortices=[];cooldown.openWorkshop();cooldown.swapSlots(1,3);
assert.equal(cooldown.links.length,0);assert.equal(cooldown.linkClocks.get(pairKey),remaining);assert.equal(cooldown.advance(.1,4),0);
cooldown.swapSlots(3,1);cooldown.swapSlots(0,2);cooldown.swapSlots(1,3); // Move the complete pair to slots 2/3.
assert.equal(cooldown.links[0].index,2);assert.equal(cooldown.linkClocks.get(pairKey),remaining,'Changing the edge index must not reset its cooldown');
cooldown.resumeWorkshop();face(cooldown,cooldown.enemies[0]);step(cooldown);assert.ok(!cooldown.effects.some(e=>e.type==='fire-vortex'),'Reconnecting the same pair cannot farm an immediate linked shot');
assert.ok(cooldown.linkClocks.get(pairKey)<remaining,'Pair cooldown advances only with combat time');
cooldown.openWorkshop();cooldown.swapSlots(2,0);cooldown.swapSlots(3,1);cooldown.resumeWorkshop();face(cooldown,cooldown.enemies[0]);step(cooldown);
assert.ok(!cooldown.effects.some(e=>e.type==='fire-vortex'),'Repeated workshop toggles still preserve cooldown');
step(cooldown,35);assert.ok(cooldown.effects.some(e=>e.type==='fire-vortex'),'The retained cooldown still expires normally');
const symmetric=fixture(['cannon','fan']);noBase(symmetric);symmetric.enemies=[enemy()];face(symmetric,symmetric.enemies[0]);step(symmetric);
const symmetricKey=[...symmetric.linkClocks.keys()][0];symmetric.openWorkshop();symmetric.swapSlots(0,1);assert.ok(symmetric.linkClocks.has(symmetricKey),'Reversing a symmetric pair preserves the same cooldown');

function applyMod(m,id){m.phase='supply';m.offers=[{kind:'mod',id}];return m.chooseOffer(0);}
const mods=fixture(['cannon','cannon','fan']);const firstId=mods.slots[0].id;assert.equal(applyMod(mods,'caliber'),true);assert.deepEqual(mods.slots.slice(0,2).map(c=>c.level),[1,1]);applyMod(mods,'caliber');assert.equal(applyMod(mods,'caliber'),false);assert.ok(!mods.availableMods().includes('caliber'));
mods.phase='combat';mods.openWorkshop();mods.swapSlots(0,3);assert.equal(mods.slots[3].id,firstId);assert.equal(mods.slots[3].level,2);mods.pendingCar='cannon';mods.install(3);assert.equal(mods.slots[3].level,0,'Replacement receives a fresh car, not the scrapped car level');mods.resumeWorkshop();
assert.equal(applyMod(mods,'fuel'),false,'An absent target cannot receive a mod');mods.phase='combat';carOffer(mods,'flame',0);assert.equal(applyMod(mods,'resonance'),true);assert.equal(applyMod(mods,'resonance'),true);assert.equal(applyMod(mods,'resonance'),false);assert.equal(mods.linkLevel,2);
const snapshot=fixture();snapshot.enemies=[enemy()];step(snapshot);const oldDamage=snapshot.projectiles[0].damage;applyMod(snapshot,'caliber');assert.equal(snapshot.projectiles[0].damage,oldDamage);snapshot.carClocks.get(snapshot.slots[0].id).cooldown=0;step(snapshot);assert.ok(snapshot.projectiles.some(p=>p.damage>oldDamage),'New attacks use the upgraded car; existing shells keep their snapshot');

// Every recipe actually fires in combat, never during installation or preview.
const recipeResults=[];
for(const recipe of RECIPES){
 const m=fixture([recipe.a,recipe.b]);noBase(m);m.enemies=[enemy(900,200,-22.5),enemy(901,250,-22.5),enemy(902,290,-22.5)];face(m,m.enemies[0]);
 assert.equal(m.seenRecipes.size,0);m.openWorkshop();assert.equal(m.advance(.1,4),0);assert.equal(m.seenRecipes.size,0);m.resumeWorkshop();step(m);
 assert.ok(m.seenRecipes.has(recipe.id));assert.equal(m.events.filter(e=>e.type==='combo_discovered').length,1);assert.ok(m.effects.some(e=>e.type==='discovery'&&e.recipeId===recipe.id));
 const kinds=[...new Set([...m.projectiles.map(p=>p.kind),...m.vortices.map(v=>v.kind)])];step(m,55);
 assert.ok(m.enemies.some(e=>e.hp<e.maxHp),`${recipe.id} must change actual enemy HP`);assert.equal(m.events.filter(e=>e.type==='combo_discovered').length,1);
 recipeResults.push({id:recipe.id,kinds});
}
const burn=fixture();noBase(burn);burn.enemies=[enemy(900,200,40),enemy(901,260,40)];burn.projectiles=[shell(1,'burn-shell',{element:'fire',burnDamage:4})];burn.moveProjectiles(1/30);assert.deepEqual(burn.enemies.map(e=>e.hp),[970,970]);assert.ok(burn.enemies.every(e=>e.burn>0));step(burn,16);assert.ok(burn.enemies.every(e=>e.hp<970),'Burning payload continues with real periodic damage');
const reignite=fixture();noBase(reignite);reignite.enemies=[enemy()];reignite.ignite(reignite.enemies[0],8);step(reignite,76);assert.equal(reignite.enemies[0].burn,0);reignite.ignite(reignite.enemies[0],2);assert.equal(reignite.enemies[0].burnDamage,2,'An expired strong burn cannot upgrade a later weaker damage snapshot');
const pierce=fixture();noBase(pierce);pierce.enemies=[enemy(900,200),enemy(901,250)];pierce.projectiles=[shell(1,'pierce')];pierce.moveProjectiles(.2);assert.deepEqual(pierce.enemies.map(e=>e.hp),[970,970]);pierce.moveProjectiles(0);assert.deepEqual(pierce.enemies.map(e=>e.hp),[970,970],'A piercing shell hits each enemy at most once');
const magnetic=fixture();noBase(magnetic);magnetic.enemies=[enemy(900,200,40,1000,2)];magnetic.projectiles=[shell(1,'magnetic')];magnetic.moveProjectiles(1/30);assert.equal(magnetic.enemies[0].hp,970);assert.ok(magnetic.enemies[0].armorBreak>0);
const shatter=fixture();noBase(shatter);shatter.enemies=[enemy()];shatter.projectiles=[shell(1,'shatter',{element:'ice'})];shatter.moveProjectiles(1/30);assert.equal(shatter.enemies[0].hp,970);assert.ok(shatter.enemies[0].freeze>0);shatter.projectiles=[shell(2,'shatter',{element:'ice'})];shatter.moveProjectiles(1/30);assert.equal(shatter.enemies[0].hp,910,'A frozen target takes double shatter damage');
const hotCold=fixture(['flame','cryo']);noBase(hotCold);hotCold.enemies=[{...enemy(900,200,-22.5),slow:2},enemy(901,260,-22.5)];face(hotCold,hotCold.enemies[0]);step(hotCold);assert.deepEqual(hotCold.enemies.map(e=>e.hp),[944,972],'Thermal shock rewards an existing cold status');
const flameWind=fixture(['flame','fan']);noBase(flameWind);flameWind.enemies=[enemy()];face(flameWind,flameWind.enemies[0]);step(flameWind);assert.ok(flameWind.vortices.some(v=>v.element==='fire'&&Math.hypot(v.dx,v.dy)>0));
const focused=fixture(['fan','flame']);noBase(focused);focused.enemies=[enemy(900,330,-85,1000,3),enemy(901,250,80)];focused.bossSpawned=true;face(focused,focused.enemies[0]);step(focused);assert.equal(focused.vortices.length,0);assert.equal(focused.boss.hp,969);assert.equal(focused.enemies[1].hp,1000,'Reversed order produces a narrow long beam, not a wide vortex');
const arcBurn=fixture(['flame','tesla']);noBase(arcBurn);arcBurn.enemies=[150,200,250,300].map((x,i)=>enemy(900+i,x,-22.5));face(arcBurn,arcBurn.enemies[0]);step(arcBurn);assert.ok(arcBurn.enemies.every(e=>e.burn>0&&e.hp===983));
const electric=fixture(['fan','tesla']);noBase(electric);electric.enemies=[enemy(900,200,-22.5),enemy(901,240,-22.5)];step(electric);assert.ok(electric.vortices.some(v=>v.element==='electric'&&v.dx===0&&v.dy===0));assert.notEqual(electric.enemies[1].y,-22.5,'An electric vortex really swirls nearby enemies');
const blizzard=fixture(['fan','cryo']);noBase(blizzard);blizzard.enemies=[enemy(900,300,-22.5)];step(blizzard);assert.equal(blizzard.enemies[0].hp,988);assert.equal(blizzard.enemies[0].slow,3.4,'Blizzard reaches beyond the standalone cryo radius');
const conduction=fixture(['tesla','cryo']);noBase(conduction);conduction.enemies=[enemy(900,200,-22.5),{...enemy(901,240,-22.5),slow:2},enemy(902,400,-22.5)];step(conduction);assert.equal(conduction.enemies[0].hp,984);assert.ok(conduction.enemies[0].freeze>0);assert.equal(conduction.enemies[1].hp,972);assert.equal(conduction.enemies[2].hp,1000);

// Counter-elements, control immunity, finite nearest-only suction and kill accounting.
for(const [kind,resisted,counter]of[[2,'physical','fire'],[4,'fire','ice'],[5,'electric','physical']]){
 const m=fixture();const e=enemy(900,200,40,1000,kind);m.enemies=[e];m.hit(e,100,resisted,0,40);const first=1000-e.hp;m.hit(e,100,counter,0,40);assert.ok(first<100);assert.equal(e.hp,900-first);
}
const immune=fixture();noBase(immune);immune.enemies=[enemy(900,200,40,1000,3)];immune.bossSpawned=true;immune.chill(immune.boss,3,2);immune.push(immune.boss,0,40,100);immune.vortices=[{...singleVortex(2,210,40),tick:0}];step(immune);assert.equal(immune.boss.x,200);assert.equal(immune.boss.y,40);assert.ok(!(immune.boss.slow>0)&&!(immune.boss.freeze>0));assert.equal(immune.boss.hp,987);
const one=fixture(),two=fixture();for(const m of[one,two]){noBase(m);m.enemies=[enemy(900,240,90)];m.vortices=[singleVortex(2,180,90)];}two.vortices.push(singleVortex(3,310,90));step(one);step(two);assert.deepEqual(one.enemies,two.enemies);assert.ok(Math.hypot(one.enemies[0].x-240,one.enemies[0].y-90)<=190/30+.00001);
const eye=fixture();noBase(eye);eye.enemies=[enemy(900,180,90)];eye.vortices=[singleVortex(2,180,90)];step(eye);assert.ok(Number.isFinite(eye.enemies[0].x)&&Number.isFinite(eye.enemies[0].y));
const credit=fixture();const victim=enemy(900,200,40,5);credit.enemies=[victim];credit.hit(victim,10,'physical',0,40);credit.hit(victim,10,'fire',0,40);assert.equal(credit.kills,1);assert.equal(credit.scrap,1);const dead=credit.effects.find(e=>e.type==='kill');assert.ok(Math.abs(Math.hypot(dead.dx,dead.dy)-1)<1e-10);
const bossCredit=fixture();const bossVictim=enemy(900,200,40,5,3);bossCredit.enemies=[bossVictim];bossCredit.hit(bossVictim,10,'ice',0,40);assert.equal(bossCredit.scrap,5);
const contact=fixture();noBase(contact);contact.hp=1;contact.enemies=[enemy(900,43,40)];step(contact);assert.equal(contact.phase,'lose');assert.equal(contact.endReason,'armor');assert.equal(contact.scrap,0);

// Scrap comes only from real deaths; six rewards pause once each and then stop.
function claimSequence(){
 const m=new Combat();m.start();m.enemies=[];m.spawnClock=-10000;noBase(m);const cards=[];
 for(const threshold of[8,24,48,80,120,170]){
  while(m.scrap<threshold){const e=enemy(1000+m.scrap,200,40,1);m.enemies.push(e);m.hit(e,1,'physical',0,40);}
  step(m);assert.equal(m.phase,'supply');assert.equal(m.supplyCount,cards.length+1);assert.equal(m.offers.length,3);
  const carIds=m.offers.filter(o=>o.kind==='car').map(o=>o.id);assert.equal(new Set(carIds).size,carIds.length);
  if(cards.length===0)assert.ok(carIds.includes('flame')&&carIds.includes('fan'));
  if(cards.length<3)assert.ok(m.offers.every(o=>o.kind==='car'));
  else {assert.equal(m.offers.filter(o=>o.kind==='mod').length,1);assert.ok(m.availableMods().includes(m.offers.find(o=>o.kind==='mod').id));}
  cards.push(m.offers.map(o=>({...o})));const frozen=JSON.stringify(m);assert.equal(m.advance(.1,4),0);assert.equal(JSON.stringify(m),frozen);
  m.chooseOffer(0);assert.equal(m.resumeWorkshop(),false);m.discardOffer();m.resumeWorkshop();
 }
 assert.equal(m.nextScrap,Infinity);for(let i=0;i<20;i++){const e=enemy(2000+i,200,40,1);m.enemies.push(e);m.hit(e,1,'physical',0,40);}step(m);assert.equal(m.phase,'combat');assert.equal(m.supplyCount,6);assert.equal(m.events.filter(e=>e.type==='supply_offer').length,6);return cards;
}
assert.deepEqual(claimSequence(),claimSequence(),'Identical seeds and decisions produce identical random offers');

const capped=fixture();capped.enemies=[];for(let i=0;i<120;i++)capped.spawn();assert.equal(capped.enemies.length,99);noBase(capped);capped.time=60-1/30;step(capped);assert.equal(capped.enemies.length,100);assert.equal(capped.enemies.filter(e=>e.kind===3).length,1);step(capped);assert.equal(capped.events.filter(e=>e.type==='boss_spawn').length,1);
const timed=fixture();noBase(timed);timed.time=80-1/30;timed.bossSpawned=true;timed.enemies=[enemy(900,285,200,1400,3)];step(timed);assert.equal(timed.phase,'lose');assert.equal(timed.endReason,'timeout');
const bossWin=fixture();noBase(bossWin);bossWin.bossSpawned=true;bossWin.enemies=[enemy(900,200,40,5,3)];bossWin.projectiles=[shell(1)];step(bossWin);assert.equal(bossWin.phase,'win');assert.equal(bossWin.endReason,'boss');
const charge=fixture();noBase(charge);charge.bossSpawned=true;charge.enemies=[enemy(900,285,200,1400,3)];charge.bossClock=4.5-1/30;step(charge);assert.equal(charge.hp,84);assert.ok(charge.effects.some(e=>e.type==='slam'));step(charge);assert.ok(charge.bossCharge>0&&charge.bossCharge<1);

function run(speed=1){
 const m=new Combat();m.start();let total=0;const rewardTimes=[];
 for(let i=0;i<2500;i++){
  if(m.phase==='supply'){
   rewardTimes.push(+m.time.toFixed(2));
   const wanted=['flame','fan','tesla','cryo'].find(t=>!m.slots.some(c=>c?.type===t)&&m.offers.some(o=>o.kind==='car'&&o.id===t));
   let index=m.supplyCount<=3&&wanted?m.offers.findIndex(o=>o.id===wanted):m.offers.findIndex(o=>o.kind==='mod');
   if(index<0)index=wanted?m.offers.findIndex(o=>o.id===wanted):0;
   assert.equal(m.chooseOffer(index),true);
  }
  if(m.phase==='workshop'){const empty=m.slots.indexOf(null);if(empty>=0)m.install(empty);else m.discardOffer();assert.equal(m.resumeWorkshop(),true);}
  total+=m.advance(1/30,speed);m.effects=[];assert.ok(m.enemies.length<=100);
  if(m.phase==='win'||m.phase==='lose')break;
 }
 assert.ok(Math.abs(total-m.time)<1e-9);m.testRewardTimes=rewardTimes;return m;
}
const result=run();assert.equal(result.phase,'win');assert.equal(result.endReason,'boss');assert.ok(result.time>63&&result.time<80);assert.equal(result.supplyCount,6);assert.ok(result.hp>0);assert.equal(result.events.filter(e=>e.type==='boss_spawn').length,1);
assert.deepEqual(result.slots.map(c=>c.type),['cannon','flame','fan','tesla']);
const state=m=>({phase:m.phase,time:m.time,hp:m.hp,kills:m.kills,scrap:m.scrap,seed:m.seed,slots:m.slots,linkLevel:m.linkLevel,projectiles:m.projectiles,vortices:m.vortices,enemies:m.enemies,events:m.events,supplyCount:m.supplyCount,seen:[...m.seenRecipes],rewardTimes:m.testRewardTimes});
for(const speed of[2,4])assert.deepEqual(state(run(speed)),state(result),`${speed}x preserves all fixed-step combat and random reward outcomes`);
const summary={result:result.phase,time:+result.time.toFixed(2),hp:result.hp,kills:result.kills,scrap:result.scrap,cars:result.slots.map(c=>({type:c.type,level:c.level})),linkLevel:result.linkLevel,links:result.links.map(l=>l.recipe.id),rewardTimes:result.testRewardTimes};
result.start(27);assert.equal(result.time,0);assert.equal(result.hp,100);assert.equal(result.scrap,0);assert.equal(result.supplyCount,0);assert.equal(result.pendingCar,null);assert.equal(result.bossSpawned,false);assert.equal(result.endReason,'');assert.equal(result.seenRecipes.size,0);assert.equal(result.slots.filter(Boolean).length,1);assert.equal(result.slots[0].type,'cannon');assert.equal(result.projectiles.length,0);assert.equal(result.vortices.length,0);assert.equal(result.linkLevel,0);
result.seedSeenRecipes(['flame-fan','bogus']);assert.deepEqual([...result.seenRecipes],['flame-fan']);result.start();assert.equal(result.seenRecipes.size,0);
console.log(JSON.stringify({checks:'5 independent cars / 11 actual recipes / adjacency-order-empty-replacement / mods follow cars and cap / pending and repeat protection / battle-only discoveries / resistance and control immunity / nearest bounded suction / real scrap and six rewards / smooth independent muzzles / pause-restart / 1-2-4 determinism / boss cap-victory-timeout',recipes:recipeResults,summary},null,2));
