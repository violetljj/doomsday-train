import assert from 'node:assert/strict';
import { Combat, SLOT_Y } from '../assets/scripts/Combat.ts';
import { CAR_TYPES, CARS, MODS, RECIPES, ROLE_NAMES, getRecipe } from '../assets/scripts/Catalog.ts';

function enemy(id=900,x=200,y=40,hp=1000,kind=0){return {id,x,y,hp,maxHp:hp,kind,speed:0,flash:0};}
function carOffer(m,type,index){m.phase='supply';m.offers=[{kind:'car',id:type}];assert.equal(m.chooseOffer(0),true);assert.equal(m.install(index),true);assert.equal(m.resumeWorkshop(),true);}
function fixture(types=['cannon']){
 const m=new Combat();m.start();m.enemies=[];m.spawnClock=-10000;m.supplyCount=6;m.nextScrap=Infinity;
 m.slots=SLOT_Y.map(()=>null);m.carClocks.clear();
 for(let i=0;i<types.length;i++)if(types[i])carOffer(m,types[i],i);
 return m;
}
function noBase(m){for(const clock of m.carClocks.values())clock.cooldown=100;}
function face(m,target){for(let i=0;i<SLOT_Y.length;i++)if(m.slots[i])m.slots[i].angle=m.slots[i].previousAngle=Math.atan2(target.y-SLOT_Y[i],target.x);}
function step(m,n=1,speed=1){for(let i=0;i<n;i++)m.advance(1/30,speed);}
const arc=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const arrival=new Combat();arrival.start(137,true);
assert.equal(arrival.enemies.length,0,'No enemies exist during train arrival');
assert.equal(arrival.advance(.1,2),0);assert.equal(arrival.time,0);assert.equal(arrival.hp,100);
arrival.pause();assert.equal(arrival.startEncounter(),false);arrival.resume();
assert.equal(arrival.startEncounter(),true);assert.equal(arrival.enemies.length,5);
assert.equal(arrival.startEncounter(),false,'Arrival completion may not duplicate the opening pack');
const immediate=new Combat();immediate.start(137);
assert.deepEqual(arrival.enemies,immediate.enemies,'Delayed arrival preserves the seeded combat opening');
arrival.start(138,true);assert.equal(arrival.enemies.length,0);assert.equal(arrival.advance(.1,2),0);
const singleVortex=(id,x,y)=>({id,x,y,dx:0,dy:0,life:10,maxLife:10,age:0,radius:76,tick:100,damage:13,kind:'fire',element:'fire'});
const shell=(id,kind='cannon',extra={})=>({id,x:190,y:40,dx:390,dy:0,life:2,radius:12,kind,damage:30,element:'physical',hitIds:[],...extra});

assert.equal(CAR_TYPES.length,8);assert.equal(Object.keys(MODS).length,15);assert.equal(RECIPES.length,16);
assert.equal(ROLE_NAMES.offense,'进攻');
assert.deepEqual(SLOT_Y,[40,-70,-180,-290,-400]);assert.equal(new Combat().slots.length,5);
const pairIds=new Set();
for(const a of CAR_TYPES){assert.ok(CARS[a].name&&CARS[a].color);assert.equal(getRecipe(a,a),null);for(const b of CAR_TYPES)if(a!==b){
 const allowed=(CARS[a].role==='offense')!==(CARS[b].role==='offense'),r=getRecipe(a,b);
 if(!allowed){assert.equal(r,null,`${a}/${b} is not an offense-support pair`);continue;}
 assert.ok(r);pairIds.add(r.id);assert.equal(getRecipe(b,a).id,r.id);assert.equal(r.directional,false);assert.equal(CARS[r.executor].role,'offense');
}}
assert.equal(pairIds.size,16);assert.equal(getRecipe('flame','fan').id,getRecipe('fan','flame').id);

// All five independent car actions work without an adjacent partner.
const cannon=fixture();cannon.enemies=[enemy()];step(cannon);assert.equal(cannon.projectiles[0].kind,'cannon');step(cannon,20);assert.ok(cannon.enemies[0].hp<1000);
const flame=fixture(['flame']);flame.enemies=[enemy()];step(flame);assert.equal(flame.enemies[0].hp,994);assert.ok(flame.effects.some(e=>e.type==='flame'&&e.carSlot===0));
const fan=fixture(['fan']);fan.enemies=[enemy()];step(fan);assert.equal(fan.enemies[0].hp,1000);assert.ok(fan.enemies[0].x>200,'Fan only pushes, without fake damage or kills');assert.equal(fan.scrap,0);
const tesla=fixture(['tesla']);tesla.enemies=[200,250,300,350].map((x,i)=>enemy(900+i,x));step(tesla);assert.deepEqual(tesla.enemies.map(e=>e.hp),[984,984,984,1000]);
const cryo=fixture(['cryo']);cryo.enemies=[enemy(900,200),enemy(901,300)];step(cryo);assert.equal(cryo.enemies[0].hp,996);assert.ok(1000-cryo.enemies[0].hp<1000-cannon.enemies[0].hp,'Standalone cryo damage is lower than the offense cannon');assert.ok(cryo.enemies[0].slow>0);assert.equal(cryo.enemies[1].hp,1000);
const slowed=fixture(),normal=fixture();noBase(slowed);noBase(normal);slowed.enemies=[{...enemy(),speed:60,slow:1}];normal.enemies=[{...enemy(),speed:60}];step(slowed);step(normal);assert.equal(200-slowed.enemies[0].x,(200-normal.enemies[0].x)/2);

// Independent slot origins, smooth shortest-arc tracking, lock hysteresis and real muzzle paths.
const origins=fixture(SLOT_Y.map(()=>'cannon'));origins.enemies=[enemy(900,200,200)];face(origins,origins.enemies[0]);step(origins);
assert.equal(origins.projectiles.length,SLOT_Y.length);for(const p of origins.projectiles){const car=origins.slots[p.carSlot];assert.ok(Math.abs(arc(car.angle,Math.atan2(p.dy,p.dx)))<1e-10);assert.ok(Math.abs(p.y-p.dy/30-SLOT_Y[p.carSlot])<1e-10);}
const turning=fixture();noBase(turning);turning.enemies=[enemy(900,Math.cos(-179*Math.PI/180)*230,40+Math.sin(-179*Math.PI/180)*230)];turning.slots[0].angle=179*Math.PI/180;
const oldAngle=turning.slots[0].angle;step(turning);const angle=turning.slots[0].angle;assert.ok(arc(oldAngle,angle)>0&&arc(oldAngle,angle)<2*Math.PI/180);
assert.ok(Math.abs(arc(oldAngle,turning.getRenderAngle(0)))<1e-10);assert.equal(turning.advance(1/60),0);assert.ok(Math.abs(arc(oldAngle,turning.getRenderAngle(0))-arc(oldAngle,angle)/2)<1e-10);
turning.pause();assert.equal(turning.advance(.1,4),0);turning.resume();assert.equal(turning.getRenderAngle(0),angle,'Resume cannot jump to the previous angle');
const lock=fixture();noBase(lock);lock.enemies=[enemy(900,200),enemy(901,-205)];step(lock);lock.enemies[0].x=202;lock.enemies[1].x=-198;step(lock);assert.ok(Math.abs(lock.slots[0].angle)<.01);lock.enemies[1].x=-90;step(lock);assert.ok(Math.abs(lock.slots[0].angle)>0&&Math.abs(lock.slots[0].angle)<=10/30+.00001);
const wait=fixture();wait.enemies=[enemy(900,-230)];step(wait);assert.equal(wait.projectiles.length,0);step(wait,20);assert.ok(wait.projectiles.length>0,'Muzzle aligns before firing across the train');

const reachTarget=fixture(['cannon',null,'fan','flame']);noBase(reachTarget);reachTarget.bossSpawned=true;
reachTarget.enemies=[enemy(900,285,200,1400,3),enemy(901,200,-335)];step(reachTarget);
assert.equal(reachTarget.carClocks.get(reachTarget.slots[3].id).targetId,901,'A rear flame car cannot abandon nearby threats for a boss beyond its 510-range beam');
assert.equal(reachTarget.carClocks.get(reachTarget.slots[0].id).targetId,900,'An in-range cannon still prioritizes the boss');
assert.equal(reachTarget.carClocks.get(reachTarget.slots[2].id).targetId,901,'Independent fan push ignores an immune boss');
reachTarget.enemies[0].x=200;reachTarget.enemies[0].y=65;step(reachTarget);
assert.equal(reachTarget.carClocks.get(reachTarget.slots[3].id).targetId,900,'The linked long beam can target a boss beyond standalone flame range');
reachTarget.openWorkshop();reachTarget.swapSlots(2,1);reachTarget.resumeWorkshop();step(reachTarget);
assert.equal(reachTarget.carClocks.get(reachTarget.slots[3].id).targetId,901,'Removing the long-range support immediately removes its targeting range');
carOffer(reachTarget,'cryo',2);step(reachTarget);
assert.equal(reachTarget.carClocks.get(reachTarget.slots[3].id).targetId,900,'Existing remote thermal attacks retain their legitimate long-range boss targeting');
const loneRemoteBoss=fixture(['flame']);loneRemoteBoss.bossSpawned=true;loneRemoteBoss.enemies=[enemy(900,285,200,1400,3)];step(loneRemoteBoss);assert.equal(loneRemoteBoss.carClocks.get(loneRemoteBoss.slots[0].id).targetId,null,'An unreachable boss is not reintroduced through the nearest-enemy fallback');

// Workshop ownership, adjacency, direction, empty slots and disposal are real state transitions.
const layout=fixture(['fan','cannon','cryo']);assert.deepEqual(layout.links.map(l=>l.recipe.id),['cannon-fan','cannon-cryo']);assert.deepEqual(layout.links.map(l=>l.driver),[1,1]);assert.deepEqual(layout.links.map(l=>l.support),[0,2]);assert.equal(layout.seenRecipes.size,0);
const shared=fixture(['cannon','fan','flame']);assert.equal(shared.links.length,2);assert.deepEqual(shared.links.map(l=>l.driver),[0,2]);assert.deepEqual(shared.links.map(l=>l.support),[1,1]);
const dense=fixture(['fan','cannon','cryo','flame','fan']);assert.equal(dense.slots.length,5);assert.equal(dense.links.length,4);
assert.deepEqual(dense.links.map(l=>[l.index,l.driver,l.support]),[[0,1,0],[1,1,2],[2,3,2],[3,3,4]]);
noBase(dense);dense.enemies=[enemy(900,200,-180)];face(dense,dense.enemies[0]);step(dense);
assert.equal(dense.effects.filter(e=>e.type==='link-feed').length,4,'All four edges independently feed their two offense drivers');
assert.ok(dense.effects.some(e=>e.type==='link-feed'&&e.y===SLOT_Y[4]&&e.carSlot===3));
assert.ok(dense.effects.some(e=>e.type==='focused-flame'&&e.carSlot===3));
const lastEdge=dense.links[3],lastKey=dense.linkKey(lastEdge.index,lastEdge.recipe),lastCooldown=dense.linkClocks.get(lastKey);
dense.openWorkshop();assert.equal(dense.swapSlots(4,5),false);assert.equal(dense.swapSlots(-1,4),false);assert.equal(dense.swapSlots(4,4),false);
assert.equal(dense.swapSlots(4,0),true);assert.equal(dense.linkClocks.get(lastKey),lastCooldown);assert.equal(dense.swapSlots(0,4),true);
dense.effects=[];dense.resumeWorkshop();step(dense);assert.ok(!dense.effects.some(e=>e.type==='focused-flame'),'Fifth-slot swaps preserve the original pair cooldown');
dense.openWorkshop();dense.pendingCar='cannon';assert.equal(dense.install(5),false);assert.equal(dense.pendingCar,'cannon');assert.equal(dense.install(4),true);
assert.equal(dense.slots[4].type,'cannon');assert.equal(dense.links.length,3,'Replacing the fifth support immediately removes the fourth edge');assert.equal(dense.install(4),false);dense.resumeWorkshop();
noBase(layout);layout.enemies=[enemy()];face(layout,layout.enemies[0]);step(layout);assert.deepEqual(new Set(layout.projectiles.map(p=>p.kind)),new Set(['pierce','shatter']),'Two supports on one gun coexist without overwriting');
assert.ok(layout.projectiles.every(p=>p.carSlot===1));assert.equal(layout.effects.filter(e=>e.type==='link-feed').length,2);
noBase(shared);shared.enemies=[enemy(900,200,-85)];face(shared,shared.enemies[0]);step(shared);assert.ok(shared.projectiles.some(p=>p.kind==='pierce'&&p.carSlot===0));assert.ok(shared.effects.some(e=>e.type==='focused-flame'&&e.carSlot===2),'One fan supports both adjacent offense cars');
assert.equal(layout.swapSlots(0,1),false);layout.openWorkshop();const frozenLayout=JSON.stringify({time:layout.time,slots:layout.slots});assert.equal(layout.advance(.1,4),0);assert.equal(JSON.stringify({time:layout.time,slots:layout.slots}),frozenLayout);
layout.swapSlots(0,1);assert.deepEqual(layout.links.map(l=>l.recipe.id),['cannon-fan']);layout.swapSlots(1,3);assert.equal(layout.links.length,0,'An empty middle slot cannot transmit a link; fan-cryo is not a recipe');
assert.equal(layout.install(-1),false);layout.pendingCar='cryo';assert.equal(layout.resumeWorkshop(),false);assert.equal(layout.install(9),false);assert.equal(layout.discardOffer(),true);assert.equal(layout.discardOffer(),false);assert.equal(layout.resumeWorkshop(),true);
const pending=fixture();pending.phase='supply';pending.offers=[{kind:'car',id:'flame'}];assert.equal(pending.chooseOffer(1),false);assert.equal(pending.chooseOffer(0),true);assert.equal(pending.chooseOffer(0),false);assert.equal(pending.offers.length,0);const retained=pending.slots[0];assert.equal(pending.swapSlots(0,1),false);pending.install(0);assert.equal(pending.slots[1],retained);assert.equal(pending.slots[0].type,'flame');assert.equal(pending.install(0),false);assert.equal(pending.phase,'workshop');pending.resumeWorkshop();
const changed=fixture(['flame','fan']);noBase(changed);changed.enemies=[enemy()];face(changed,changed.enemies[0]);step(changed);assert.equal(changed.seenRecipes.size,1);assert.ok(changed.effects.some(e=>e.type==='focused-flame'));changed.effects=[];changed.vortices=[];changed.openWorkshop();changed.swapSlots(1,3);changed.resumeWorkshop();step(changed,40);assert.equal(changed.links.length,0);assert.ok(!changed.effects.some(e=>e.type==='focused-flame'),'An old edge must stop triggering after a swap');
carOffer(changed,'cannon',0);assert.equal(changed.slots[0].type,'cannon');assert.equal(changed.links.length,0);

const cooldown=fixture(['flame','fan']);noBase(cooldown);cooldown.enemies=[enemy()];face(cooldown,cooldown.enemies[0]);step(cooldown);
const pairKey=[...cooldown.linkClocks.keys()][0], remaining=cooldown.linkClocks.get(pairKey);assert.ok(remaining>.4);
cooldown.effects=[];cooldown.vortices=[];cooldown.openWorkshop();cooldown.swapSlots(1,3);
assert.equal(cooldown.links.length,0);assert.equal(cooldown.linkClocks.get(pairKey),remaining);assert.equal(cooldown.advance(.1,4),0);
cooldown.swapSlots(3,1);cooldown.swapSlots(0,2);cooldown.swapSlots(1,3); // Move the complete pair to slots 2/3.
assert.equal(cooldown.links[0].index,2);assert.equal(cooldown.linkClocks.get(pairKey),remaining,'Changing the edge index must not reset its cooldown');
cooldown.resumeWorkshop();face(cooldown,cooldown.enemies[0]);step(cooldown);assert.ok(!cooldown.effects.some(e=>e.type==='focused-flame'),'Reconnecting the same pair cannot farm an immediate linked shot');
assert.ok(cooldown.linkClocks.get(pairKey)<remaining,'Pair cooldown advances only with combat time');
cooldown.openWorkshop();cooldown.swapSlots(2,0);cooldown.swapSlots(3,1);cooldown.resumeWorkshop();face(cooldown,cooldown.enemies[0]);step(cooldown);
assert.ok(!cooldown.effects.some(e=>e.type==='focused-flame'),'Repeated workshop toggles still preserve cooldown');
step(cooldown,35);assert.ok(cooldown.effects.some(e=>e.type==='focused-flame'),'The retained cooldown still expires normally');
const symmetric=fixture(['cannon','fan']);noBase(symmetric);symmetric.enemies=[enemy()];face(symmetric,symmetric.enemies[0]);step(symmetric);
const symmetricKey=[...symmetric.linkClocks.keys()][0];symmetric.openWorkshop();symmetric.swapSlots(0,1);assert.ok(symmetric.linkClocks.has(symmetricKey),'Reversing a symmetric pair preserves the same cooldown');

// Inserting into an occupied slot preserves existing cars until all five slots are full.
const inserted=fixture(['flame','fan','cannon',null,'cryo']);noBase(inserted);inserted.enemies=[enemy()];face(inserted,inserted.enemies[0]);step(inserted);
const oldCars=inserted.slots.filter(Boolean),oldClocks=new Map(inserted.carClocks),oldPair=inserted.linkKey(0,inserted.links[0].recipe),oldCooldown=inserted.linkClocks.get(oldPair);
oldCars[0].level=2;inserted.openWorkshop();inserted.pendingCar='tesla';assert.equal(inserted.swapSlots(0,1),false);assert.equal(inserted.install(0),true);
assert.deepEqual(inserted.slots.slice(1),oldCars,'Right insertion moves the occupied segment to the nearest right gap');
assert.equal(inserted.slots[1].level,2);for(const car of oldCars)assert.equal(inserted.carClocks.get(car.id),oldClocks.get(car.id));
assert.equal(inserted.linkClocks.get(oldPair),oldCooldown,'Insertion retains cooldown history for surviving car pairs');
inserted.effects=[];inserted.resumeWorkshop();face(inserted,inserted.enemies[0]);step(inserted);assert.ok(!inserted.effects.some(e=>e.type==='focused-flame'),'Insertion cannot refresh the shifted pair for an instant shot');
inserted.openWorkshop();inserted.pendingCar='cannon';const scrapped=inserted.slots[1];inserted.install(1);
assert.equal(inserted.slots.filter(Boolean).length,5);assert.ok(!inserted.slots.includes(scrapped));assert.ok(!inserted.carClocks.has(scrapped.id));assert.ok(!inserted.linkClocks.has(oldPair));assert.equal(inserted.slots[1].level,0);assert.ok(inserted.carClocks.has(oldCars[1].id));
const holes=fixture(['cannon',null,'flame','fan',null]),holesBefore=holes.slots.slice();carOffer(holes,'cryo',2);
assert.deepEqual(holes.slots,[holesBefore[0],null,holes.slots[2],holesBefore[2],holesBefore[3]],'A right gap is preferred even when a left gap also exists');assert.equal(holes.slots[2].type,'cryo');
const leftInsert=fixture([null,'fan',null,'flame','cannon']),leftBefore=leftInsert.slots.slice();leftBefore[4].level=2;carOffer(leftInsert,'cryo',4);
assert.deepEqual(leftInsert.slots.slice(0,4),[null,leftBefore[1],leftBefore[3],leftBefore[4]],'With no right gap, shift only the segment after the nearest left gap');assert.equal(leftInsert.slots[3].level,2);assert.equal(leftInsert.slots[4].type,'cryo');
const directEmpty=fixture(['cannon',null,'fan',null,'cryo']),emptyBefore=directEmpty.slots.slice();carOffer(directEmpty,'tesla',1);
for(const i of[0,2,3,4])assert.equal(directEmpty.slots[i],emptyBefore[i],'Installing into an empty slot never shifts other cars');
const pausedWorkshop=fixture();pausedWorkshop.advance(1/60);pausedWorkshop.pause();const pausedTime=pausedWorkshop.time;assert.equal(pausedWorkshop.openWorkshop(),true);assert.equal(pausedWorkshop.phase,'workshop');assert.equal(pausedWorkshop.advance(.1,4),0);assert.equal(pausedWorkshop.time,pausedTime);assert.equal(pausedWorkshop.resumeWorkshop(),true);assert.equal(pausedWorkshop.getRenderAngle(0),pausedWorkshop.slots[0].angle);
pausedWorkshop.phase='supply';pausedWorkshop.offers=[{kind:'car',id:'fan'}];pausedWorkshop.pause();assert.equal(pausedWorkshop.openWorkshop(),false,'A paused unclaimed supply cannot be bypassed through the workshop');pausedWorkshop.resume();pausedWorkshop.chooseOffer(0);pausedWorkshop.pause();assert.equal(pausedWorkshop.openWorkshop(),true);assert.equal(pausedWorkshop.pendingCar,'fan');assert.equal(pausedWorkshop.swapSlots(0,1),false);assert.equal(pausedWorkshop.resumeWorkshop(),false);

function applyMod(m,id){m.phase='supply';m.offers=[{kind:'mod',id}];return m.chooseOffer(0);}
const mods=fixture(['cannon','cannon','fan']);const firstId=mods.slots[0].id;assert.equal(applyMod(mods,'caliber'),true);assert.deepEqual(mods.slots.slice(0,2).map(c=>c.level),[1,1]);applyMod(mods,'caliber');assert.equal(applyMod(mods,'caliber'),false);assert.ok(!mods.availableMods().includes('caliber'));
mods.phase='combat';mods.openWorkshop();mods.swapSlots(0,4);assert.equal(mods.slots[4].id,firstId);assert.equal(mods.slots[4].level,2);mods.pendingCar='cryo';mods.install(0);mods.pendingCar='tesla';mods.install(3);mods.pendingCar='cannon';mods.install(4);assert.equal(mods.slots[4].level,0,'Full-slot replacement receives a fresh car, not the scrapped car level');mods.resumeWorkshop();
assert.equal(applyMod(mods,'fuel'),false,'An absent target cannot receive a mod');mods.phase='combat';carOffer(mods,'flame',0);assert.equal(applyMod(mods,'resonance'),true);assert.equal(applyMod(mods,'resonance'),true);assert.equal(applyMod(mods,'resonance'),false);assert.equal(mods.linkLevel,2);
const snapshot=fixture();snapshot.enemies=[enemy()];step(snapshot);const oldDamage=snapshot.projectiles[0].damage;applyMod(snapshot,'caliber');assert.equal(snapshot.projectiles[0].damage,oldDamage);snapshot.carClocks.get(snapshot.slots[0].id).cooldown=0;step(snapshot);assert.ok(snapshot.projectiles.some(p=>p.damage>oldDamage),'New attacks use the upgraded car; existing shells keep their snapshot');

// Every recipe actually fires in combat, never during installation or preview.
const recipeResults=[];
for(const recipe of RECIPES)for(const reversed of [false,true]){
 const types=reversed?[recipe.b,recipe.a]:[recipe.a,recipe.b],m=fixture(types);noBase(m);m.enemies=[enemy(900,200,-22.5),enemy(901,250,-22.5),enemy(902,290,-22.5)];face(m,m.enemies[0]);
 const {driver,support}=m.links[0];assert.equal(m.slots[driver].type,recipe.executor);assert.notEqual(CARS[m.slots[support].type].role,'offense');
 assert.equal(m.seenRecipes.size,0);m.openWorkshop();assert.equal(m.advance(.1,4),0);assert.equal(m.seenRecipes.size,0);m.resumeWorkshop();step(m);
 assert.ok(m.seenRecipes.has(recipe.id));assert.equal(m.events.filter(e=>e.type==='combo_discovered').length,1);
 const emitted=m.effects.filter(e=>e.recipeId===recipe.id);assert.equal(emitted[0].type,'link-feed','Support energy precedes the actual linked attack');assert.ok(emitted.every(e=>e.carSlot===driver));
 assert.equal(emitted[0].y,SLOT_Y[support]);assert.equal(emitted[0].dy,SLOT_Y[driver]-SLOT_Y[support]);
 for(const p of m.projectiles){assert.equal(p.carSlot,driver);const ox=p.x-p.dx/30,oy=p.y-p.dy/30-SLOT_Y[driver];assert.ok(Math.hypot(ox,oy)<=30+1e-9);assert.ok(Math.abs(ox*p.dx+oy*p.dy)<1e-6,'Parallel lanes originate perpendicular to the driver muzzle');}
 if(['flame-cryo','fan-tesla'].includes(recipe.id)){const beam=emitted.find(e=>e.type==='link-shot');assert.ok(beam);assert.equal(beam.x,0);assert.equal(beam.y,SLOT_Y[driver]);assert.equal(beam.dx,200);assert.equal(beam.dy,-22.5-SLOT_Y[driver]);}
 for(const effect of emitted.filter(e=>e.type==='conduction'||e.type==='focused-flame'))assert.equal(effect.y,SLOT_Y[driver]);
 const kinds=[...new Set([...m.projectiles.map(p=>p.kind),...m.vortices.map(v=>v.kind)])];step(m,55);
 assert.ok(m.enemies.some(e=>e.hp<e.maxHp),`${recipe.id} must change actual HP in either order`);assert.equal(m.events.filter(e=>e.type==='combo_discovered').length,1);
 recipeResults.push({id:recipe.id,reversed,driver,support,kinds});
}
const pierce=fixture();noBase(pierce);pierce.enemies=[enemy(900,200),enemy(901,250)];pierce.projectiles=[shell(1,'pierce')];pierce.moveProjectiles(.2);assert.deepEqual(pierce.enemies.map(e=>e.hp),[970,970]);pierce.moveProjectiles(0);assert.deepEqual(pierce.enemies.map(e=>e.hp),[970,970],'A piercing shell hits each enemy at most once');
const shatter=fixture();noBase(shatter);shatter.enemies=[enemy()];shatter.projectiles=[shell(1,'shatter',{element:'ice'})];shatter.moveProjectiles(1/30);assert.equal(shatter.enemies[0].hp,970);assert.ok(shatter.enemies[0].freeze>0);shatter.projectiles=[shell(2,'shatter',{element:'ice'})];shatter.moveProjectiles(1/30);assert.equal(shatter.enemies[0].hp,910,'A frozen target takes double shatter damage');
const hotCold=fixture(['flame','cryo']);noBase(hotCold);hotCold.enemies=[{...enemy(900,200,-22.5),slow:2},enemy(901,260,-22.5)];face(hotCold,hotCold.enemies[0]);step(hotCold);assert.deepEqual(hotCold.enemies.map(e=>e.hp),[944,972],'Thermal shock rewards an existing cold status');
const focused=fixture(['fan','flame']);noBase(focused);focused.enemies=[enemy(900,330,-85,1000,3),enemy(901,250,80)];focused.bossSpawned=true;face(focused,focused.enemies[0]);step(focused);assert.equal(focused.vortices.length,0);assert.equal(focused.boss.hp,948);assert.equal(focused.enemies[1].hp,1000,'Fan-flame produces the same focused beam from the flame car');
const electric=fixture(['fan','tesla']);noBase(electric);electric.enemies=[enemy(900,200,-22.5),enemy(901,240,-22.5)];step(electric);assert.ok(electric.vortices.some(v=>v.element==='electric'&&v.dx===0&&v.dy===0));assert.notEqual(electric.enemies[1].y,-22.5,'An electric vortex really swirls nearby enemies');
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
const rearContact=fixture();noBase(rearContact);rearContact.enemies=[enemy(900,43,SLOT_Y[4])];step(rearContact);assert.equal(rearContact.hp,95,'Enemies can hit the fifth carriage at the extended tail');

// New independent roles, meaningful modifier tradeoffs and snapshot-preserving delayed bursts.
const railBase=fixture(['rail']);railBase.enemies=[enemy(900,200,40),enemy(901,250,40)];step(railBase,22);assert.ok(railBase.enemies.every(e=>e.hp<1000));
const prismBase=fixture(['prism']);prismBase.enemies=[enemy()];step(prismBase);assert.equal(prismBase.enemies[0].hp,1000);assert.ok(prismBase.effects.some(e=>e.type==='prism'));
const acidBase=fixture(['acid']);acidBase.enemies=[enemy(900,200,40,1000,2)];step(acidBase);assert.equal(acidBase.enemies[0].hp,997);assert.ok(acidBase.enemies[0].corrosion>0);acidBase.hit(acidBase.enemies[0],100,'physical',0,40);assert.equal(acidBase.enemies[0].hp,897);
for(const [type,mod,base]of[['cannon','rapid',.66],['tesla','surge',.95]]){const m=fixture([type]);m.enemies=[enemy()];applyMod(m,mod);step(m);assert.ok(Math.abs(m.carClocks.get(m.slots[0].id).cooldown-base*.8)<1e-8);applyMod(m,mod);assert.equal(applyMod(m,mod),false);}
const reachMod=fixture(['flame']);reachMod.enemies=[enemy(900,290,40)];applyMod(reachMod,'reach');step(reachMod);assert.equal(reachMod.getCarRange(0),300);assert.equal(reachMod.enemies[0].hp,994);assert.equal(reachMod.effects.find(e=>e.type==='flame').size,300);
for(const [type,mod,damage]of[['cannon','scatter',26],['rail','lanes',42]]){const m=fixture([type]);m.enemies=[enemy()];applyMod(m,mod);applyMod(m,mod);step(m);assert.equal(m.projectiles.length,3);assert.ok(m.projectiles.every(p=>p.damage<damage));assert.ok(m.projectiles.reduce((sum,p)=>sum+p.damage,0)>damage);assert.equal(new Set(m.projectiles.map(p=>mod==='lanes'?p.y:p.dy)).size,3);const shots=m.projectiles.map(p=>p.damage);applyMod(m,type==='rail'?'railpower':'caliber');assert.deepEqual(m.projectiles.map(p=>p.damage),shots);}
const burst=fixture();burst.enemies=[enemy()];applyMod(burst,'burst');applyMod(burst,'burst');step(burst);assert.equal(burst.projectiles.length,1);assert.equal(burst.burstQueue.length,2);assert.equal(burst.projectiles[0].damage,26*.6);const burstOwner=burst.slots[0].id;
burst.pause();const queueBefore=JSON.stringify(burst.burstQueue);assert.equal(burst.advance(.1,4),0);assert.equal(JSON.stringify(burst.burstQueue),queueBefore);burst.openWorkshop();burst.swapSlots(0,4);burst.resumeWorkshop();applyMod(burst,'caliber');burst.enemies[0].x=-200;step(burst,4);assert.ok(burst.projectiles.some(p=>p.carSlot===4&&p.dx>0&&p.damage===26*.6),'Delayed shot follows owner slot but keeps original angle and damage');assert.equal(burst.slots[4].id,burstOwner);
for(let i=0;i<4;i++)carOffer(burst,'fan',i);burst.openWorkshop();burst.pendingCar='rail';burst.install(4);assert.equal(burst.burstQueue.length,0,'Scrapping the owner cancels its pending burst');
for(const [type,mod]of[['rail','railpower'],['prism','prismfocus'],['acid','acidpotency']]){const m=fixture([type]);assert.equal(applyMod(m,mod),true);assert.equal(m.slots[0].level,1);assert.equal(m.slots[0].mods[mod],1);}
const serial=fixture();serial.enemies=[enemy(900,1000,40)];applyMod(serial,'burst');applyMod(serial,'burst');step(serial);assert.equal(serial.projectiles.length,1);step(serial,3);assert.equal(serial.projectiles.length,1);step(serial);assert.equal(serial.projectiles.length,2);step(serial,4);assert.equal(serial.projectiles.length,3);assert.equal(serial.burstQueue.length,0);assert.ok(serial.projectiles.every(p=>p.damage===26*.6));
const laneSupport=fixture(['rail','cryo']);noBase(laneSupport);laneSupport.enemies=[{...enemy(900,200,40),freeze:2},enemy(901,250,40)];face(laneSupport,laneSupport.enemies[0]);step(laneSupport,22);assert.ok(laneSupport.enemies[0].hp<laneSupport.enemies[1].hp);assert.ok(laneSupport.enemies[1].freeze>0);
// New enemies retain clear counters and never create credited phantom kills.
const shield=fixture();const shielded={...enemy(900,200,40,1000,6),barrier:20};shield.enemies=[shielded];shield.hit(shielded,10,'physical',0,40);assert.equal(shielded.hp,1000);assert.equal(shielded.barrier,10);shielded.corrosion=3;shield.hit(shielded,20,'physical',0,40);assert.equal(shielded.hp,985);assert.equal(shielded.barrier,5);
for(const kind of[4,5]){const m=fixture(['acid']);m.enemies=[enemy(900,200,40,1000,kind)];step(m);m.hit(m.enemies[0],100,kind===4?'fire':'electric',0,40);assert.equal(m.enemies[0].hp,897);}
const brood=fixture();brood.enemies=[enemy(900,200,40,1,7)];brood.hit(brood.enemies[0],5,'physical',0,40);assert.equal(brood.enemies.filter(e=>e.hp>0).length,2);assert.equal(brood.scrap,1);brood.hit(brood.enemies[0],5,'physical',0,40);assert.equal(brood.enemies.length,3);
const broodCap=fixture();broodCap.enemies=Array.from({length:99},(_,i)=>enemy(1000+i,200,40,1,i===0?7:0));broodCap.hit(broodCap.enemies[0],5,'physical',0,40);assert.equal(broodCap.enemies.filter(e=>e.hp>0).length,99);
const regen=fixture();noBase(regen);regen.enemies=[{...enemy(900,200,40,1000,8),hp:500,regenClock:0}];step(regen);assert.equal(regen.enemies[0].hp,580);regen.enemies[0].regenClock=0;regen.ignite(regen.enemies[0],4);step(regen);assert.equal(regen.enemies[0].hp,580);assert.ok(regen.effects.some(e=>e.type==='regen'));
const mix=fixture();mix.time=100;mix.enemies=[];const kinds=new Set();for(let i=0;i<200;i++){mix.spawn();kinds.add(mix.enemies[0].kind);mix.enemies=[];}for(const kind of[0,1,2,4,5,6,7,8])assert.ok(kinds.has(kind));mix.spawn();assert.ok(mix.enemies[0].maxHp>24);

// Scrap rewards continue beyond the opening six, and every offer has valid distinct choices.
function claimSequence(){
 const m=new Combat();m.start();m.enemies=[];m.spawnClock=-10000;noBase(m);const cards=[];
 for(let round=0;round<9;round++){
  const threshold=m.nextScrap;
  while(m.scrap<threshold){const e=enemy(1000+m.scrap,200,40,1);m.enemies.push(e);m.hit(e,1,'physical',0,40);}
  step(m);assert.equal(m.phase,'supply');assert.equal(m.supplyCount,round+1);assert.equal(m.offers.length,3);
  const carIds=m.offers.filter(o=>o.kind==='car').map(o=>o.id);assert.equal(new Set(carIds).size,carIds.length);
  assert.ok(carIds.some(id=>CARS[id].role==='offense'));assert.ok(carIds.some(id=>CARS[id].role!=='offense'));
  if(round===0)assert.ok(carIds.includes('fan')&&carIds.includes('cryo'));
  if(round<4)assert.ok(m.offers.every(o=>o.kind==='car'));else assert.ok(m.availableMods().includes(m.offers.find(o=>o.kind==='mod').id));
  cards.push(m.offers.map(o=>({...o})));const frozen=JSON.stringify(m);assert.equal(m.advance(.1,4),0);assert.equal(JSON.stringify(m),frozen);
  m.chooseOffer(0);m.discardOffer();m.resumeWorkshop();
 }
 assert.equal(m.supplyCount,9);assert.ok(Number.isFinite(m.nextScrap)&&m.nextScrap>m.scrap);return cards;
}
assert.deepEqual(claimSequence(),claimSequence());
const capped=fixture();capped.enemies=[];for(let i=0;i<120;i++)capped.spawn();assert.equal(capped.enemies.length,99);noBase(capped);capped.time=40-1/30;step(capped);assert.equal(capped.enemies.length,100);assert.equal(capped.boss.kind,3);assert.equal(capped.wave,3);
const endless=fixture();noBase(endless);endless.time=80-1/30;step(endless);assert.equal(endless.phase,'combat');assert.equal(endless.wave,5);const firstBoss=endless.boss;endless.hit(firstBoss,1e6,'ice',0,40);step(endless);assert.equal(endless.phase,'combat');assert.equal(endless.boss,null);assert.equal(endless.events.filter(e=>e.type==='boss_killed').length,1);
endless.time=140-1/30;step(endless);assert.ok(endless.boss);assert.equal(endless.events.filter(e=>e.type==='boss_spawn').length,2);assert.equal(endless.endReason,'');
const charge=fixture();noBase(charge);charge.bossSpawned=true;charge.enemies=[enemy(900,285,200,1400,3)];charge.bossClock=4.5-1/30;step(charge);assert.equal(charge.hp,84);assert.ok(charge.effects.some(e=>e.type==='slam'));

function run(speed=1){
 const m=new Combat();m.start();let total=0,peakEnemies=0;const rewardTimes=[];
 for(let i=0;i<6000&&m.time<120-1e-8;i++){
  if(m.phase==='supply'){
   rewardTimes.push(+m.time.toFixed(2));
   const tail=m.slots.filter(Boolean).at(-1),candidates=['fan','flame','tesla','rail','cryo','prism','acid','cannon'].filter(t=>m.offers.some(o=>o.kind==='car'&&o.id===t));
   const compatible=candidates.filter(t=>(CARS[t].role==='offense')!==(CARS[tail.type].role==='offense'));
   const choices=compatible.length?compatible:candidates,wanted=choices.find(t=>!m.slots.some(c=>c?.type===t))??choices[0];
   let index=m.supplyCount<=4&&wanted?m.offers.findIndex(o=>o.id===wanted):m.offers.findIndex(o=>o.kind==='mod');
   if(index<0)index=wanted?m.offers.findIndex(o=>o.id===wanted):0;
   assert.equal(m.chooseOffer(index),true);
  }
  if(m.phase==='workshop'){const empty=m.slots.indexOf(null);if(empty>=0)m.install(empty);else m.discardOffer();assert.equal(m.resumeWorkshop(),true);}
  total+=m.advance(Math.min(1/30,(120-m.time)/speed),speed);m.effects=[];assert.ok(m.enemies.length<=100);peakEnemies=Math.max(peakEnemies,m.enemies.length);
  if(m.phase==='win'||m.phase==='lose')break;
 }
 assert.ok(Math.abs(total-m.time)<1e-9);m.testRewardTimes=rewardTimes;m.testPeakEnemies=peakEnemies;return m;
}
const result=run();assert.ok(result.time>=60,'A natural supported route reaches at least three waves');assert.ok(result.phase==='combat'||(result.phase==='lose'&&result.endReason==='armor'));assert.equal(result.slots.length,5);
const state=m=>({phase:m.phase,time:m.time,hp:m.hp,kills:m.kills,scrap:m.scrap,seed:m.seed,slots:m.slots,linkLevel:m.linkLevel,projectiles:m.projectiles,vortices:m.vortices,enemies:m.enemies,events:m.events,burstQueue:m.burstQueue,wave:m.wave,supplyCount:m.supplyCount,seen:[...m.seenRecipes],rewardTimes:m.testRewardTimes});
for(const speed of[2,4])assert.deepEqual(state(run(speed)),state(result),`${speed}x preserves all fixed-step combat and random reward outcomes`);
const summary={wave:result.wave,bossKills:result.events.filter(e=>e.type==='boss_killed').length,choices:result.events.filter(e=>e.type==='offer_chosen').map(e=>({time:+e.time.toFixed(2),choice:e.value})),result:result.phase,reason:result.endReason,bossHp:result.boss?.hp,time:+result.time.toFixed(2),hp:result.hp,peakEnemies:result.testPeakEnemies,kills:result.kills,scrap:result.scrap,cars:result.slots.map(c=>c?({type:c.type,level:c.level,mods:c.mods}):null),linkLevel:result.linkLevel,links:result.links.map(l=>l.recipe.id),rewardTimes:result.testRewardTimes};
result.start(27);assert.equal(result.time,0);assert.equal(result.hp,100);assert.equal(result.scrap,0);assert.equal(result.supplyCount,0);assert.equal(result.pendingCar,null);assert.equal(result.bossSpawned,false);assert.equal(result.endReason,'');assert.equal(result.seenRecipes.size,0);assert.equal(result.slots.length,SLOT_Y.length);assert.equal(result.slots.filter(Boolean).length,1);assert.equal(result.slots[0].type,'cannon');assert.equal(result.projectiles.length,0);assert.equal(result.vortices.length,0);assert.equal(result.linkLevel,0);
result.seedSeenRecipes(['flame-fan','bogus']);assert.deepEqual([...result.seenRecipes],['flame-fan']);result.start();assert.equal(result.seenRecipes.size,0);
console.log(JSON.stringify({checks:'8 role-based independent cars / 16 real recipes in both orders / correct offense emitter / five functional slots and four edges / two supports and shared fan / adjacency-empty-replacement / mods follow cars and cap / pending and repeat protection / battle-only discoveries / resistance and control immunity / nearest bounded suction / real scrap and continuous rewards / smooth independent muzzles / pause-restart / 1-2-4 determinism / endless wave and elite cycles / 15 real modifiers and queued bursts',recipes:recipeResults,summary},null,2));
