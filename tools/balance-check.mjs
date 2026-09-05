import { Combat } from '../assets/scripts/Combat.ts';
for(const route of ['twin','giant']) {
 const m=new Combat();m.start();const checkpoints=[];
 for(let i=0;i<1900;i++){
  if(m.phase==='reward'){checkpoints.push({time:m.time,hp:m.hp,kills:m.kills});m.beginArrange();m.installFan();}
  if(m.phase==='upgrade'){checkpoints.push({time:m.time,hp:m.hp,kills:m.kills});m.choose(route);}
  m.advance(1/30);m.effects=[];
  if(['win','lose'].includes(m.phase))break;
 }
 console.log(JSON.stringify({route,phase:m.phase,time:m.time,hp:m.hp,kills:m.kills,checkpoints}));
}
