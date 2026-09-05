import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';

function run(route,seed=137,speed=1){
  const m=new Combat();m.start(seed);
  let peakEnemies=0;
  const density=[];
  for(let i=0;i<1900;i++){
    if(m.phase==='reward'){const hp=m.hp;m.beginArrange();m.installFan();assert.equal(m.hp,hp,'Assembly must not heal');}
    if(m.phase==='upgrade'){const hp=m.hp;m.choose(route);assert.equal(m.hp,hp,'Upgrade must not heal');}
    m.advance(1/30,speed);
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
for(let i=0;i<15&&!paused.vortices.length;i++)paused.advance(1/30);
assert.ok(paused.vortices.length>0,'Installing fan changes actual attacks after the muzzle aligns');
const once=paused.events.filter(e=>e.type==='fan_installed').length;paused.installFan();assert.equal(paused.events.filter(e=>e.type==='fan_installed').length,once);

function stationaryEnemy(x=240,y=90,hp=100){return {id:900,x,y,hp,maxHp:hp,speed:0,kind:0,flash:0};}
function stationaryVortex(id,x,y){return {id,x,y,dx:0,dy:0,life:10,maxLife:10,age:0,radius:65,tick:100,damage:13};}
function isolated(){
  const m=new Combat();m.start();m.enemies=[stationaryEnemy()];m.vortices=[];
  // Isolate the actual fixed-step movement/damage from spawning and firing.
  m.fireClock=100;m.spawnClock=-100;return m;
}
const arc=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
const atAngle=(id,angle,radius=230)=>({...stationaryEnemy(Math.cos(angle)*radius,40+Math.sin(angle)*radius),id});
const turning=isolated();turning.turretAngle=179*Math.PI/180;
turning.enemies=[atAngle(900,-179*Math.PI/180)];
const oldAngle=turning.turretAngle;turning.advance(1/30);
assert.ok(arc(oldAngle,turning.turretAngle)>0&&arc(oldAngle,turning.turretAngle)<2*Math.PI/180,'179 to -179 must take the short positive arc');
const currentAngle=turning.turretAngle;
assert.ok(Math.abs(arc(oldAngle,turning.renderTurretAngle))<1e-10,'Render starts at the previous fixed step');
assert.equal(turning.advance(1/60),0);
assert.ok(Math.abs(arc(oldAngle,turning.renderTurretAngle)-arc(oldAngle,currentAngle)/2)<1e-10,'Rendering interpolates across the angle seam');
turning.pause();assert.equal(turning.renderTurretAngle,turning.turretAngle);
assert.equal(turning.advance(.1,4),0);assert.equal(turning.turretAngle,currentAngle);
turning.resume();assert.equal(turning.renderTurretAngle,currentAngle,'Resume must not interpolate back to a pre-pause angle');
turning.start();assert.equal(turning.turretAngle,0);assert.equal(turning.renderTurretAngle,0);
assert.deepEqual(turning.aim,{x:220,y:40});

for(const [stopTime,phase] of [[8,'reward'],[25,'upgrade']]){
  const modal=isolated();modal.time=stopTime-1/30;modal.rewarded=stopTime===25;modal.nextWave=4;
  modal.enemies=[atAngle(900,1)];modal.advance(1/30);
  assert.equal(modal.phase,phase);assert.ok(modal.turretAngle>0);
  const stoppedAngle=modal.renderTurretAngle;
  if(phase==='reward'){modal.beginArrange();assert.equal(modal.renderTurretAngle,stoppedAngle);modal.installFan();}
  else modal.choose('giant');
  assert.equal(modal.renderTurretAngle,stoppedAngle,'Leaving a reward or upgrade must preserve the displayed angle');
}

const lock=isolated();lock.enemies=[stationaryEnemy(200,40),{...stationaryEnemy(-205,40),id:901}];
lock.advance(1/30);assert.ok(lock.aim.x>0);
lock.enemies[0].x=202;lock.enemies[1].x=-198;lock.advance(1/30);
assert.ok(lock.aim.x>0,'Small changes in closest enemy must not reverse the turret');
lock.enemies[1].x=-100;lock.advance(1/30);
assert.ok(lock.aim.x<0,'A substantially closer threat must break target lock');
assert.ok(Math.abs(lock.turretAngle)<=10/30+.00001,'Switching sides must obey turn speed');
lock.enemies[1].hp=0;lock.advance(1/30);assert.ok(lock.aim.x>0,'Dead locked targets must be released');

const waiting=isolated();waiting.form='tornado';waiting.fireClock=0;waiting.enemies=[atAngle(900,Math.PI)];
waiting.advance(1/30);assert.equal(waiting.vortices.length,0,'Do not fire away from a target while rotating');
for(let i=0;i<20&&!waiting.vortices.length;i++)waiting.advance(1/30);
assert.ok(waiting.vortices.length>0,'Rotation must settle and fire promptly');
assert.ok(Math.abs(arc(waiting.turretAngle,Math.PI))<.2);
for(const form of ['tornado','twin','giant']){
  const shot=isolated();shot.form=form;shot.fireClock=0;shot.enemies=[atAngle(900,.3)];shot.advance(1/30);
  assert.equal(shot.vortices.length,form==='twin'?2:1);
  const offsets=form==='twin'?[-.22,.22]:[0];
  shot.vortices.forEach((v,i)=>assert.ok(Math.abs(arc(shot.turretAngle+offsets[i],Math.atan2(v.dy,v.dx)))<1e-10,'Projectile direction must follow the muzzle'));
}
const flame=isolated();flame.fireClock=0;flame.enemies=[atAngle(900,.35,200),atAngle(901,-.25,225),atAngle(902,.7,230)];
flame.advance(1/30);
assert.equal(flame.enemies.find(e=>e.id===901).hp,95,'Flame must damage inside the actual muzzle cone');
assert.equal(flame.enemies.find(e=>e.id===902).hp,100,'Flame must not use the unsmoothed target direction');

const clocked=isolated();assert.equal(clocked.advance(1,4),.4,'Clamp real frame time before applying speed');
assert.ok(Math.abs(clocked.time-.4)<1e-10);
assert.equal(clocked.advance(Number.NaN,4),0);assert.equal(clocked.advance(-1,4),0);
for(const speed of [1,2,4]){
  const gate=new Combat();gate.start();let simulated=0;
  while(gate.phase==='combat')simulated+=gate.advance(.1,speed);
  assert.equal(gate.phase,'reward');assert.ok(Math.abs(gate.time-8)<1e-9);assert.ok(Math.abs(simulated-8)<1e-9);
  const stopped=gate.time;assert.equal(gate.advance(.1,speed),0);
  gate.beginArrange();assert.equal(gate.advance(.1,speed),0);assert.equal(gate.time,stopped);
  gate.installFan();while(gate.phase==='combat')simulated+=gate.advance(.1,speed);
  assert.equal(gate.phase,'upgrade');assert.ok(Math.abs(gate.time-25)<1e-9);assert.ok(Math.abs(simulated-25)<1e-9);
  assert.equal(gate.advance(.1,speed),0);
  gate.choose('twin');gate.pause();assert.equal(gate.advance(.1,speed),0);gate.resume();
  const before=gate.time;assert.ok(gate.advance(1/30,speed)>0);assert.ok(gate.time>before);
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
  assert.ok(a.testStats.peakEnemies>=20,'Baseline must retain a substantial actual wave');
  assert.ok(a.testStats.peakEnemies<100,'Baseline should not spend its run at the entity cap');
  results.push({route,result:a.phase,hp:a.hp,kills:a.kills,time:Number(a.time.toFixed(2)),peakEnemies:a.testStats.peakEnemies,
    densityAt:a.testStats.density.filter(s=>[8,11,25,29,45,50,57,60].includes(s.time))});
  const state=m=>({phase:m.phase,time:m.time,hp:m.hp,kills:m.kills,seed:m.seed,events:m.events,enemies:m.enemies,vortices:m.vortices,turretAngle:m.turretAngle});
  for(const speed of [2,4])assert.deepEqual(state(run(route,137,speed)),state(a),`${speed}x must preserve the identical fixed-step outcome for ${route}`);
  a.start(27);assert.equal(a.time,0);assert.equal(a.form,'flame');assert.equal(a.hp,100);assert.equal(a.vortices.length,0);
}
const loss=new Combat();loss.start();loss.hp=1;loss.enemies=[{id:900,x:43,y:40,hp:100,maxHp:100,speed:30,kind:0,flash:0}];loss.advance(1/30);assert.equal(loss.phase,'lose');
assert.equal(loss.kills,0,'Contact damage must not award a fake kill');
console.log(JSON.stringify({checks:'shortest arc/render interpolation/target lock/turn limit/alignment/projectile and flame direction/1x-2x-4x determinism/returned simulated time/modal speed stops/pause/reward/assembly/nearest bounded suction/finite eye/expired vortex/damage snapshot/periodic damage/ejection/no healing/wave warnings/two routes/restart/death',results},null,2));
