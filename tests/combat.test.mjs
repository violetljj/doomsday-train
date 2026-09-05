import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';

function run(route,seed=137){
  const m=new Combat();m.start(seed);
  let peakEnemies=0;
  const density=[];
  for(let i=0;i<1900;i++){
    if(m.phase==='reward'){const hp=m.hp;m.beginArrange();m.installFan();assert.equal(m.hp,hp,'Assembly must not heal');}
    if(m.phase==='upgrade'){const hp=m.hp;m.choose(route);assert.equal(m.hp,hp,'Upgrade must not heal');}
    m.advance(1/30);
    m.effects.length=0;
    assert.ok(m.enemies.length<=100);
    peakEnemies=Math.max(peakEnemies,m.enemies.length);
    if(i%30===29)density.push({time:Math.round(m.time),count:m.enemies.length});
    if(['win','lose'].includes(m.phase))break;
  }
  m.testStats={peakEnemies,density};
  return m;
}
const paused=new Combat();paused.start();
for(let i=0;i<240;i++)paused.advance(1/30);
assert.equal(paused.phase,'reward');
const frozen=JSON.stringify({time:paused.time,enemies:paused.enemies,hp:paused.hp});
for(let i=0;i<120;i++)paused.advance(1/30);
assert.equal(JSON.stringify({time:paused.time,enemies:paused.enemies,hp:paused.hp}),frozen);
paused.pause();paused.resume();assert.equal(paused.phase,'reward');
paused.beginArrange();paused.pause();paused.resume();assert.equal(paused.phase,'arrange');
paused.installFan();assert.equal(paused.form,'tornado');
paused.advance(1/30);assert.ok(paused.vortices.length>0,'Installing fan changes actual attacks');
const once=paused.events.filter(e=>e.type==='fan_installed').length;paused.installFan();assert.equal(paused.events.filter(e=>e.type==='fan_installed').length,once);

function stationaryEnemy(x=240,y=90,hp=100){return {id:900,x,y,hp,maxHp:hp,speed:0,kind:0,flash:0};}
function stationaryVortex(id,x,y){return {id,x,y,dx:0,dy:0,life:10,maxLife:10,age:0,radius:65,tick:100,damage:13};}
function isolated(){
  const m=new Combat();m.start();m.enemies=[stationaryEnemy()];m.vortices=[];
  // Isolate the actual fixed-step movement/damage from spawning and firing.
  m.fireClock=100;m.spawnClock=-100;return m;
}
const single=isolated(), overlapping=isolated();
single.vortices=[stationaryVortex(2,180,90)];
overlapping.vortices=[stationaryVortex(2,180,90),stationaryVortex(3,310,90)];
single.advance(1/30);overlapping.advance(1/30);
assert.deepEqual(single.enemies,overlapping.enemies,'A farther overlapping vortex must not stack movement force');
const pulled=single.enemies[0];
assert.ok(Math.hypot(pulled.x-180,pulled.y-90)<60,'Suction must close distance');
assert.notEqual(pulled.y,90,'Suction must include a visible tangential component');
assert.ok(Math.hypot(pulled.x-240,pulled.y-90)<=190/30+.00001,'Suction displacement must be bounded');
const eye=isolated();eye.enemies=[stationaryEnemy(180,90)];eye.vortices=[stationaryVortex(2,180,90)];
eye.advance(1/30);assert.ok(Number.isFinite(eye.enemies[0].x)&&Number.isFinite(eye.enemies[0].y),'The eye must not divide by zero');
const expired=isolated();expired.vortices=[{...stationaryVortex(2,180,90),life:.01}];
expired.advance(1/30);assert.equal(expired.enemies[0].x,240,'Expired vortices must stop pulling');

const snapshot=isolated();snapshot.form='tornado';snapshot.vortex(0);
const old=snapshot.vortices[0];old.x=240;old.y=90;old.dx=old.dy=0;
snapshot.phase='upgrade';const beforeChoiceHp=snapshot.hp;snapshot.choose('giant');snapshot.fireClock=100;
assert.equal(snapshot.hp,beforeChoiceHp);assert.equal(old.damage,13,'Existing vortex damage is frozen');
snapshot.vortex(0);assert.equal(snapshot.vortices[1].damage,18,'New giant vortices get giant damage');
snapshot.vortices[1].x=-1000;
snapshot.advance(1/30);assert.equal(snapshot.enemies[0].hp,87,'First tick must use old damage after upgrade');
snapshot.advance(1/30);assert.equal(snapshot.enemies[0].hp,87,'Damage must not apply every frame');
snapshot.pause();const frozenAttack=JSON.stringify({time:snapshot.time,hp:snapshot.hp,enemies:snapshot.enemies,vortices:snapshot.vortices});
for(let i=0;i<30;i++)snapshot.advance(1/30);
assert.equal(JSON.stringify({time:snapshot.time,hp:snapshot.hp,enemies:snapshot.enemies,vortices:snapshot.vortices}),frozenAttack,'Pause must freeze suction, damage, age and lifetime');
snapshot.resume();for(let i=0;i<3;i++)snapshot.advance(1/30);
assert.equal(snapshot.enemies[0].hp,74,'The next periodic tick must retain its damage snapshot');
const killed=isolated();killed.enemies=[stationaryEnemy(245,90,13)];killed.vortices=[{...stationaryVortex(2,240,90),tick:0}];
killed.advance(1/30);assert.equal(killed.kills,1);assert.equal(killed.enemies.length,0);
const death=killed.effects.find(e=>e.type==='kill');
assert.ok(death&&Math.abs(Math.hypot(death.dx,death.dy)-1)<.00001,'Death ejection must have a normalized direction');
assert.equal(death.enemyKind,0);assert.ok(death.dx>0,'Death ejection must point outward from the vortex');
assert.ok(killed.effects.some(e=>e.type==='hit'),'Real damage must emit hit feedback');

const results=[];
for(const route of ['twin','giant']){
  const a=run(route), b=run(route);
  assert.equal(a.phase,'win',`default ${route} route should be completable`);
  assert.equal(a.form,route);assert.ok(a.kills>100,'Must visibly clear a substantial wave');
  assert.deepEqual({hp:a.hp,kills:a.kills,events:a.events},{hp:b.hp,kills:b.kills,events:b.events});
  assert.equal(a.events.filter(e=>e.type==='upgrade_pick').length,1);
  assert.equal(a.events.filter(e=>e.type==='run_end').length,1);
  assert.deepEqual(a.events.filter(e=>e.type==='wave').map(e=>e.value),['5','21','45','50'],'Each authored wave warning must occur exactly once');
  assert.equal(a.events.find(e=>e.type==='wind_reward').time.toFixed(2),'8.00');
  assert.equal(a.events.find(e=>e.type==='upgrade_offer').time.toFixed(2),'25.00');
  assert.ok(a.hp<100,'Baseline must retain some real pressure');
  assert.ok(a.testStats.peakEnemies<100,'Baseline should not spend its run at the entity cap');
  results.push({route,result:a.phase,hp:a.hp,kills:a.kills,time:Number(a.time.toFixed(2)),peakEnemies:a.testStats.peakEnemies,
    densityAt:a.testStats.density.filter(s=>[8,11,25,29,45,50,57,60].includes(s.time))});
  a.start(27);assert.equal(a.time,0);assert.equal(a.form,'flame');assert.equal(a.hp,100);assert.equal(a.vortices.length,0);
}
const loss=new Combat();loss.start();loss.hp=1;loss.enemies=[{id:900,x:43,y:40,hp:100,maxHp:100,speed:30,kind:0,flash:0}];loss.advance(1/30);assert.equal(loss.phase,'lose');
assert.equal(loss.kills,0,'Contact damage must not award a fake kill');
console.log(JSON.stringify({checks:'pause/reward/assembly/nearest bounded suction/finite eye/expired vortex/damage snapshot/periodic damage/ejection/no healing/wave warnings/two routes/determinism/restart/death',results},null,2));
