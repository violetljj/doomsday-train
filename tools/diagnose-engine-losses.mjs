import {Combat} from '../assets/scripts/Combat.ts';
import {simulate} from './simulate.mjs';
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const output=process.argv[2];if(!output||existsSync(`${output}/report.json`))throw Error('Supply a fresh output directory');
const original=Combat.prototype.damageTrain;const rows=[];let hits=[];
try{
 Combat.prototype.damageTrain=function(amount,source){const before=this.hp;original.call(this,amount,source);if(this.hp<before)hits.push({time:+this.time.toFixed(2),source,lost:before-this.hp,armor:this.hp,slots:this.slots.map(c=>c?`${c.type}+${c.level}`:null),enemies:this.enemies.filter(e=>e.hp>0&&!(e.surfaceWait>0)).length});};
 for(const engine of ['dawn','storm','haven'])for(let seed=1;seed<=20;seed++){hits=[];const run=simulate(seed,180,'balanced',{engine,module:'none'});rows.push({...run,hits});}
}finally{Combat.prototype.damageTrain=original;}
const hashes=Object.fromEntries(['assets/scripts/Combat.ts','tools/simulate.mjs','tools/diagnose-engine-losses.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
mkdirSync(output,{recursive:true});writeFileSync(`${output}/report.json`,JSON.stringify({scenario:'20 matched seeds per engine, no module, balanced scripted policy; damageTrain observed without changing behavior. Not human play.',hashes,rows},null,2));
for(const engine of ['dawn','storm','haven']){const runs=rows.filter(r=>r.loadout.engine===engine);console.log(JSON.stringify({engine,survived:runs.filter(r=>r.outcome==='horizon').length,losses:runs.filter(r=>r.outcome==='lose').map(r=>({seed:r.seed,time:r.seconds,slots:r.slots,firstHits:r.hits.slice(0,3),lastHits:r.hits.slice(-3)}))}));}
