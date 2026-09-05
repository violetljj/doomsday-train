import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';

function run(route,seed=137){
  const m=new Combat();m.start(seed);
  for(let i=0;i<1900;i++){
    if(m.phase==='reward'){m.beginArrange();m.installFan();}
    if(m.phase==='upgrade')m.choose(route);
    m.advance(1/30);
    m.effects.length=0;
    assert.ok(m.enemies.length<=100);
    if(['win','lose'].includes(m.phase))break;
  }
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
const results=[];
for(const route of ['twin','giant']){
  const a=run(route), b=run(route);
  assert.equal(a.phase,'win',`default ${route} route should be completable`);
  assert.equal(a.form,route);assert.ok(a.kills>100,'Must visibly clear a substantial wave');
  assert.deepEqual({hp:a.hp,kills:a.kills,events:a.events},{hp:b.hp,kills:b.kills,events:b.events});
  assert.equal(a.events.filter(e=>e.type==='upgrade_pick').length,1);
  assert.equal(a.events.filter(e=>e.type==='run_end').length,1);
  results.push({route,result:a.phase,hp:a.hp,kills:a.kills,time:Number(a.time.toFixed(2))});
  a.start(27);assert.equal(a.time,0);assert.equal(a.form,'flame');assert.equal(a.hp,100);assert.equal(a.vortices.length,0);
}
const loss=new Combat();loss.start();loss.hp=1;loss.enemies=[{id:900,x:43,y:40,hp:100,maxHp:100,speed:30,kind:0,flash:0}];loss.advance(1/30);assert.equal(loss.phase,'lose');
console.log(JSON.stringify({checks:'pause/reward/assembly/real attack/two routes/determinism/restart/death',results},null,2));
