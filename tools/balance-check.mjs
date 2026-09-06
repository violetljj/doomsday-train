import { Combat, SLOT_Y } from '../assets/scripts/Combat.ts';
import { CARS } from '../assets/scripts/Catalog.ts';
const priority=['fan','flame','tesla','cryo','cannon'];
const concentrated=process.argv.includes('--concentrated');
const speed=2,m=new Combat();m.start(137);const checkpoints=[];
for(let frame=0;frame<3000;frame++){
  if(m.phase==='supply'){
    const tail=m.slots.filter(Boolean).at(-1);
    const candidates=priority.filter(type=>m.offers.some(o=>o.kind==='car'&&o.id===type));
    const compatible=candidates.filter(type=>(CARS[type].role==='offense')!==(CARS[tail.type].role==='offense'));
    const choices=compatible.length?compatible:candidates;
    const wanted=choices.find(type=>!m.slots.some(c=>c?.type===type))??choices[0];
    const duplicate=m.slots.findIndex((car,i)=>car&&m.slots.some((other,j)=>j<i&&other?.type===car.type));
    let pick=wanted&&(concentrated?(m.slots.includes(null)||duplicate>=0):m.supplyCount<=SLOT_Y.length-1)?m.offers.findIndex(o=>o.id===wanted):m.offers.findIndex(o=>o.kind==='mod');
    if(pick<0)pick=wanted?m.offers.findIndex(o=>o.id===wanted):0;
    checkpoints.push({time:+m.time.toFixed(2),hp:m.hp,scrap:m.scrap,offers:m.offers.slice(),chosen:m.offers[pick]});
    m.chooseOffer(pick);
  }
  if(m.phase==='workshop'){
    if(m.pendingCar){const empty=m.slots.findIndex(c=>!c),duplicate=m.slots.findIndex((car,i)=>car&&m.slots.some((other,j)=>j<i&&other?.type===car.type));if(empty>=0)m.install(empty);else if(concentrated&&duplicate>=0)m.install(duplicate);else m.discardOffer();}
    if(concentrated&&m.slots.slice(0,4).map(c=>c?.type).join(',')==='cannon,fan,flame,cryo'){m.swapSlots(0,1);m.swapSlots(2,3);}
    m.resumeWorkshop();
  }
  m.advance(1/30,speed);m.effects.length=0;
  if(m.phase==='win'||m.phase==='lose')break;
}
console.log(JSON.stringify({policy:concentrated?'concentrated-support':'shared-fan',result:m.phase,reason:m.endReason,time:+m.time.toFixed(2),hp:m.hp,kills:m.kills,bossHp:m.boss?.hp,speed,
  slots:m.slots.map(c=>c?{type:c.type,level:c.level}:null),links:m.links.map(l=>({id:l.recipe.id,driver:l.driver,support:l.support})),discoveries:Array.from(m.seenRecipes),checkpoints},null,2));
