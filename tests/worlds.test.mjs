import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { WORLDS, WORLD_IDS, WORLD_DURATION, WORLD_ENEMY_WEIGHTS, evaluateWorld, selectWorldEnemy } from '../assets/scripts/Worlds.ts';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const step=(m,n=1,speed=1)=>{for(let i=0;i<n;i++)m.advance(1/30,speed);};
function isolated(configured=true){
  const m=new Combat();m.start(884,false,configured?{engine:'haven',module:'capacitor'}:undefined);
  m.enemies=[];m.spawnClock=-1e9;m.nextBossWave=Infinity;m.nextScrap=Infinity;m.nextModifierTime=Infinity;
  for(const clock of m.carClocks.values())clock.cooldown=1e9;
  return m;
}
assert.equal(WORLD_DURATION,60);assert.equal(WORLD_IDS.length,12);
assert.deepEqual(WORLD_IDS.map(id=>WORLDS[id].name),['雨巷废城','铜锈货场','白霜电站','深潮水库','孢雾花园','余烬要塞','镜盐荒原','风蚀沙海','断桥高架','陨坑灰原','极光冻湖','失落天港']);
assert.equal(new Set(WORLD_IDS.map(id=>WORLDS[id].art)).size,12);
assert.deepEqual(WORLD_IDS.map((id,i)=>WORLDS[id].art),WORLD_IDS.map((id,i)=>`afterglow-${id}-${i<6?'v2':'v1'}`));
assert.deepEqual(WORLD_IDS.slice(0,6).map(id=>WORLD_ENEMY_WEIGHTS[id]),[
  [[0,.55],[1,.30],[2,.10],[6,.05]],[[0,.35],[1,.10],[2,.30],[7,.20],[4,.05]],
  [[0,.35],[1,.10],[5,.30],[6,.20],[2,.05]],[[0,.40],[1,.25],[6,.25],[5,.10]],
  [[0,.35],[1,.10],[8,.30],[7,.20],[4,.05]],[[0,.30],[1,.10],[2,.25],[4,.25],[6,.10]],
],'First six regional encounter weights retain the previous balance contract');
for(const t of [-1,NaN,Infinity])assert.equal(evaluateWorld(t).id,'city');
for(let ordinal=0;ordinal<=24;ordinal++){
  const time=ordinal*60,state=evaluateWorld(time);
  assert.equal(state.id,WORLD_IDS[ordinal%12]);assert.equal(state.index,ordinal%12);assert.equal(state.cycle,Math.floor(ordinal/12));
  near(state.progress,0);near(state.remaining,60);
  if(time>0)assert.equal(evaluateWorld(time-.001).id,WORLD_IDS[(ordinal-1)%12]);
  near(evaluateWorld(time+30).progress,.5);near(evaluateWorld(time+30).remaining,30);
}
for(let i=0;i<WORLD_IDS.length;i++){
  const id=WORLD_IDS[i],weights=WORLD_ENEMY_WEIGHTS[id];near(weights.reduce((sum,[kind,weight])=>sum+weight,0),1);
  assert.ok(weights.every(([kind,weight])=>Number.isInteger(kind)&&kind>=0&&kind<=8&&kind!==3&&weight>0));
  const ordinary=weights.find(([kind])=>kind===0)[1];assert.ok(ordinary>=.3&&ordinary<=.55);
  const histogram={};for(let j=0;j<1000;j++){const kind=selectWorldEnemy(i*60+59,(j+.5)/1000);histogram[kind]=(histogram[kind]||0)+1;}
  for(const [kind,weight] of weights)near(histogram[kind],weight*1000);
}
for(let i=0;i<100;i++)assert.equal(selectWorldEnemy(0,i/100),0,'Departure only introduces ordinary enemies');
assert.equal(selectWorldEnemy(12,.7),1);assert.equal(selectWorldEnemy(17,.9),0);assert.equal(selectWorldEnemy(18,.9),2);
assert.equal(selectWorldEnemy(43,.98),0);assert.equal(selectWorldEnemy(44,.98),6);

const paused=isolated();step(paused,900);near(paused.worldState.progress,.5);paused.pause();const frozen=JSON.stringify(paused.worldState);assert.equal(paused.advance(.1,4),0);assert.equal(JSON.stringify(paused.worldState),frozen);
paused.openWorkshop();paused.swapSlots(0,4);paused.resumeWorkshop();near(paused.worldState.progress,.5);
step(paused,900);assert.equal(paused.worldState.id,'foundry');assert.equal(paused.events.filter(e=>e.type==='region_enter').length,1);
paused.pause();paused.resume();step(paused);assert.equal(paused.events.filter(e=>e.type==='region_enter').length,1,'Pause/re-entry cannot duplicate region banners');
const arriving=new Combat();arriving.start(884,true,{engine:'dawn',module:'none'});assert.equal(arriving.advance(.1,4),0);assert.equal(arriving.worldState.progress,0);

// A region boundary preserves live entities, rewards and clocks; only normal tick decay occurs.
const boundary=isolated();boundary.time=60-1/30;boundary.hp=85;boundary.shieldHp=7;boundary.kills=17;boundary.scrap=23;boundary.supplyCount=2;boundary.nextScrap=55;boundary.nextSupplyTime=66;boundary.route='cargo';boundary.engineClock=9;boundary.passiveRepairClock=-100;
boundary.openWorkshop();boundary.pendingCar='fan';boundary.install(1);boundary.resumeWorkshop();
const link=boundary.links[0],key=boundary.linkKey(link.index,link.recipe);boundary.linkClocks.set(key,3);
for(const clock of boundary.carClocks.values())clock.cooldown=5;
const sentinel={id:900,x:1000,y:-1000,hp:200,maxHp:200,speed:0,kind:2,flash:0},boss={...sentinel,id:901,kind:3,hp:1000,maxHp:1000};boundary.enemies=[sentinel,boss];boundary.bossClock=2;
const originalSlots=[...boundary.slots];step(boundary);
assert.equal(boundary.worldState.id,'foundry');assert.ok(boundary.enemies.includes(sentinel)&&boundary.enemies.includes(boss));assert.equal(sentinel.hp,200);assert.equal(boss.hp,1000);
assert.deepEqual(boundary.slots,originalSlots);assert.equal(boundary.hp,85);assert.equal(boundary.shieldHp,7);assert.equal(boundary.kills,17);assert.equal(boundary.scrap,23);assert.equal(boundary.supplyCount,2);assert.equal(boundary.nextScrap,55);assert.equal(boundary.nextSupplyTime,66);assert.equal(boundary.route,'cargo');
near(boundary.engineState.cooldown,9-1/30);near(boundary.linkClocks.get(key),3-1/30);near(boundary.bossClock,2+1/30);
for(const clock of boundary.carClocks.values())near(clock.cooldown,5-1/30);

// Check Combat consumes the regional roll and keeps forced route reinforcements authoritative.
for(let i=0;i<WORLD_IDS.length;i++){
  const m=isolated();m.time=i*60+59;m.random=()=>.8;m.spawn();assert.equal(m.enemies[0].kind,selectWorldEnemy(m.time,.8));
  m.spawn(false,2,2);const forced=m.enemies[1];assert.equal(forced.kind,2);near(forced.hp,48*m.enemyHealthScale*2);
}
const legacy=isolated(false);legacy.time=120;legacy.random=()=>.8;legacy.spawn();assert.equal(legacy.enemies[0].kind,6,'Legacy spawn thresholds remain unchanged');
legacy.enemies=[];step(legacy);assert.equal(legacy.events.some(e=>e.type==='region_enter'),false);

function run(speed){const m=isolated();step(m,720*30/speed,speed);return {time:m.time,world:m.worldState,engine:m.engineState,hp:m.hp,shield:m.shieldHp,events:m.events};}
const normal=run(1);assert.deepEqual(normal,run(2));assert.deepEqual(normal,run(4));
assert.deepEqual(normal.events.filter(e=>e.type==='region_enter').map(e=>e.value),[...WORLD_IDS.slice(1),'city']);assert.equal(normal.world.cycle,1);assert.equal(normal.engine.activations,36);
const restarted=isolated();step(restarted,1800);restarted.start(884,false,{engine:'haven',module:'capacitor'});assert.equal(restarted.worldState.id,'city');assert.equal(restarted.worldState.cycle,0);assert.equal(restarted.events.some(e=>e.type==='region_enter'),false);
console.log('Worlds passed: twelve boundaries/cycles, unchanged first-six mixes, introduction gates, configured/legacy routing, preserved live battle state, arrival/pause/swap freeze and 1/2/4 determinism.');
