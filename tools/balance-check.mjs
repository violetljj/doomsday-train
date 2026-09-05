import { Combat } from '../assets/scripts/Combat.ts';
for(const route of ['twin','giant']) {
 const m=new Combat();m.start();const checkpoints=[];
 for(let i=0;i<3000;i++){
  if(m.phase==='reward'){checkpoints.push({time:m.time,hp:m.hp,kills:m.kills});m.beginArrange();m.installFan();}
  if(m.phase==='upgrade'){checkpoints.push({time:m.time,hp:m.hp,kills:m.kills});m.choose(route);}
  if(m.phase==='supply'){checkpoints.push({time:m.time,hp:m.hp,choices:m.choices.slice()});m.chooseSupply(m.choices[0]);}
  m.advance(1/30);m.effects=[];
  if(['win','lose'].includes(m.phase))break;
 }
 console.log(JSON.stringify({route,module:m.module,perks:m.perks,phase:m.phase,reason:m.endReason,time:m.time,hp:m.hp,kills:m.kills,checkpoints}));
}
