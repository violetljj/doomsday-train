import { RECIPES } from './Catalog.ts';
import { normalizeLoadout } from './Locomotives.ts';
import type { ModuleId, RunLoadout } from './Locomotives.ts';

export interface GarageState {
  version: 1;
  loadout: RunLoadout;
  records: { runs:number; bestTime:number; bestWave:number; totalKills:number; bossKills:number; recipes:string[] };
}
export interface RunReceipt { time:number; wave:number; kills:number; bosses:number; recipes:readonly string[] }
const count=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
const recipeIds=new Set(RECIPES.map(recipe=>recipe.id));
export function newGarage():GarageState {
  return {version:1,loadout:{engine:'dawn',module:'none'},records:{runs:0,bestTime:0,bestWave:0,totalKills:0,bossKills:0,recipes:[]}};
}
/** Defensive parsing keeps a broken old browser save from preventing departure. */
export function readGarage(raw:string|null,knownRecipes:readonly string[]=[]):GarageState {
  const state=newGarage();
  try{
    const parsed=raw?JSON.parse(raw):null;
    if(parsed?.version===1){
      state.loadout=normalizeLoadout(parsed.loadout);
      for(const key of ['runs','bestTime','bestWave','totalKills','bossKills'] as const)state.records[key]=count(parsed.records?.[key]);
      if(Array.isArray(parsed.records?.recipes))state.records.recipes=parsed.records.recipes.filter((id:unknown)=>typeof id==='string'&&recipeIds.has(id));
    }
  }catch{}
  state.records.recipes=Array.from(new Set([...state.records.recipes,...knownRecipes.filter(id=>recipeIds.has(id))]));
  if(!moduleUnlocked(state,state.loadout.module))state.loadout.module='none';
  return state;
}
export function moduleUnlocked(state:GarageState,id:ModuleId):boolean {
  return id==='none'||id==='plating'||id==='salvager'&&state.records.recipes.length>=3||id==='capacitor'&&state.records.bossKills>=1;
}
export function moduleUnlockHint(state:GarageState,id:ModuleId):string {
  if(moduleUnlocked(state,id))return '已解锁';
  return id==='salvager'?`发现配方 ${Math.min(3,state.records.recipes.length)}/3`:'击破首领 0/1';
}
/** Call exactly once for an ended run; discovery progress can also be saved while alive. */
export function recordRun(state:GarageState,run:RunReceipt):GarageState {
  const next=readGarage(JSON.stringify(state),run.recipes);
  next.records.runs++;
  next.records.bestTime=Math.max(next.records.bestTime,count(run.time));
  next.records.bestWave=Math.max(next.records.bestWave,count(run.wave));
  next.records.totalKills+=count(run.kills);next.records.bossKills+=count(run.bosses);
  return next;
}
export function selectGarageLoadout(state:GarageState,input:RunLoadout):GarageState {
  const loadout=normalizeLoadout(input);
  if(!moduleUnlocked(state,loadout.module))loadout.module=state.loadout.module;
  return {...state,loadout};
}
