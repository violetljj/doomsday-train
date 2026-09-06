import { Combat } from '../assets/scripts/Combat.ts';
const desired=['cannon','flame','fan','cryo'];
const m=new Combat();m.start(137);const checkpoints=[];
for(let frame=0;frame<3000;frame++){
  if(m.phase==='supply'){
    checkpoints.push({time:+m.time.toFixed(2),hp:m.hp,scrap:m.scrap,offers:m.offers.slice()});
    let pick=m.offers.findIndex(o=>o.kind==='car'&&desired.includes(o.id)&&!m.slots.some(c=>c?.type===o.id));
    if(pick<0)pick=m.offers.findIndex(o=>o.kind==='mod');
    m.chooseOffer(pick<0?0:pick);
  }
  if(m.phase==='workshop'){
    if(m.pendingCar){const empty=m.slots.findIndex(c=>!c);if(empty>=0)m.install(empty);else m.discardOffer();}
    m.resumeWorkshop();
  }
  m.advance(1/30);m.effects.length=0;
  if(m.phase==='win'||m.phase==='lose')break;
}
console.log(JSON.stringify({result:m.phase,reason:m.endReason,time:+m.time.toFixed(2),hp:m.hp,kills:m.kills,
  slots:m.slots.map(c=>c?{type:c.type,level:c.level}:null),links:m.links.map(l=>l.recipe.id),discoveries:[...m.seenRecipes],checkpoints},null,2));
