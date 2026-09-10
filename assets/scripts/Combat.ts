import { CAR_TYPES, CARS, MODS, RECIPES, getRecipe } from './Catalog.ts';
import type { CarType, ModId, Recipe } from './Catalog.ts';
import { deriveBuildIdentity, evaluateBuildProgression, deriveCrossfeed, crossfeedSummary } from './BuildProgression.ts';
import type { BuildIdentity, BuildProgressionSnapshot, BuildProgressionState } from './BuildProgression.ts';
import { ENGINES, normalizeLoadout } from './Locomotives.ts';
import type { EngineId, RunLoadout } from './Locomotives.ts';
import { evaluateWorld, selectWorldEnemy, WORLD_IDS } from './Worlds.ts';

export interface EngineState { id: EngineId; name: string; skillName: string; description: string; cooldown: number; chargeTime: number; activations: number; }

export interface BuildPowerState {
  identity: BuildIdentity; tier: number; summary: string;
  weaponDamageMultiplier: number; linkDamageMultiplier: number; supportPowerMultiplier: number; scrapMultiplier: number;
  attackRateMultiplier: number; linkRateMultiplier: number;
  overdrive: { name: string; description: string; eligible: boolean; active: boolean; remaining: number; cooldown: number; duration: number; chargeTime: number };
}

export type Phase = 'menu' | 'combat' | 'supply' | 'workshop' | 'paused' | 'win' | 'lose';
export type DamageType = 'physical' | 'fire' | 'electric' | 'ice' | 'acid';
export type StationRoute = 'cargo' | 'arsenal' | 'repair';
export interface Car { id: number; type: CarType; angle: number; previousAngle: number; flash: number; level: number; mods: Partial<Record<ModId, number>>; }
export interface Offer { kind: 'car' | 'mod' | 'repair'; id: CarType | ModId | 'repair'; amount?: number; }
export interface RewardState { kind: 'car' | 'mod'; source: 'xp' | 'timer' | 'elite'; title: string; }
export interface Enemy { id: number; x: number; y: number; hp: number; maxHp: number; speed: number; kind: number; flash: number; slow?: number; freeze?: number; armorBreak?: number; burn?: number; burnDamage?: number; burnClock?: number; corrosion?: number; barrier?: number; regenClock?: number; }
export interface Effect { type: string; x: number; y: number; size: number; dx?: number; dy?: number; enemyId?: number; enemyKind?: number; recipeId?: string; carSlot?: number; source?: string; element?: DamageType; damage?: number; }
export interface Vortex { id: number; x: number; y: number; dx: number; dy: number; life: number; maxLife: number; age: number; radius: number; tick: number; damage: number; kind: 'fire' | 'electric'; element: 'fire' | 'electric'; recipeId?: string; carSlot?: number; }
export interface Projectile { id: number; x: number; y: number; dx: number; dy: number; life: number; radius: number; kind: string; damage: number; element: DamageType; recipeId?: string; carSlot?: number; source?: string; hitIds: number[]; burnDamage?: number; corrosion?: number; slow?: number; freeze?: number; knockback?: number; frozenBonus?: number; beam?: boolean; resolved?: boolean; }
export interface CarAttackStats { damage:number; element:DamageType; count:number; interval:number; utility?:number; burst?:number; mode:'shot'|'cone'|'targets'|'pulse'|'push'|'repair'|'shield'; }
export const SLOT_Y = [40, -70, -180, -290, -400];
const REWARDS = [8, 28, 55, 95, 150, 220];
const MODIFIER_INTERVAL = 30;
interface BurstShot { ownerId: number; delay: number; angle: number; damage: number; radius: number; }
interface CarClock { cooldown: number; targetId: number | null; }

/** Deterministic 30 Hz simulation. Every attack keeps its creation-time damage. */
export class Combat {
  phase: Phase = 'menu'; previous: Phase = 'combat';
  time = 0; hp = 100; maxHp = 100; kills = 0; scrap = 0; nextScrap = 8; supplyCount = 0;
  nextSupplyTime = 0;
  rewardState: RewardState | null = null;
  private rewardQueue: RewardState[] = [];
  private carBag: CarType[] = [];
  private earnedCarRewards = 0;
  private previousCarThreshold = 0;
  nextModifierTime = MODIFIER_INTERVAL;
  get modifierWait() { return Math.max(0,this.nextModifierTime-this.time); }
  get carRewardProgress() { const required=this.nextScrap-this.previousCarThreshold,current=Math.max(0,Math.min(required,this.scrap-this.previousCarThreshold));return {current,required,ratio:Number.isFinite(required)?current/required:0,level:this.earnedCarRewards,nextThreshold:this.nextScrap}; }
  get queuedRewardCount() { return this.rewardQueue.length; }
  stationChoices = false; stationCount = 0;
  route: StationRoute | null = null;
  private routeSpawns = 0; private escortAt = Infinity;
  get routeName() { return this.route === 'cargo' ? '货场支线' : this.route === 'arsenal' ? '军械支线' : this.route === 'repair' ? '维修支线' : ''; }
  seed = 137; initialSeed = 137; revision = 0; linkLevel = 0;
  slots: (Car | null)[] = SLOT_Y.map(() => null);
  pendingCar: CarType | null = null; offers: Offer[] = [];
  enemies: Enemy[] = []; vortices: Vortex[] = []; projectiles: Projectile[] = []; effects: Effect[] = [];
  events: { type: string; time: number; value?: string }[] = [];
  seenRecipes = new Set<string>();
  bossSpawned = false; bossCharge = 0; endReason = '';
  firstStationCleared = false; milestoneSupply = false;
  mainDamageSource = ''; damageBySource: Record<string, number> = {};
  private nextId = 0; private accumulator = 0; private spawnClock = 0; private bossClock = 0; private waveIndex = 0;
  private encounterStarted = false; private nextBossWave = 3;
  private burstQueue: BurstShot[] = [];
  private passiveRepairClock = 0;
  private linkActivationCount = 0;
  private bossKillCount = 0;
  private scrapRemainder = 0;
  private formationCharge = 0;
  private formationRemaining = 0;
  private formationIdentity: BuildIdentity | null = null;
  private formationPulse = 0;
  private stepPower: BuildPowerState | null = null;
  private configuredLoadout: RunLoadout | null = null;
  private engineClock = 20;
  private engineActivations = 0;
  private regionOrdinal = 0;
  private introducedEnemyKinds = new Set<number>();
  shieldHp = 0;
  get maxShield() { return 24 + (this.configuredLoadout?.module==='capacitor'?8:0) + this.slots.reduce((sum,car)=>sum+(car?.type==='shield'?car.level*4:0),0); }
  get runLoadout(): RunLoadout | null { return this.configuredLoadout?{...this.configuredLoadout}:null; }
  get worldState() { return evaluateWorld(this.time); }
  get engineState(): EngineState | null {
    if(!this.configuredLoadout)return null;
    const engine=ENGINES[this.configuredLoadout.engine];
    return {id:engine.id,name:engine.name,skillName:engine.skillName,description:engine.skillDescription,cooldown:Math.max(0,this.engineClock),chargeTime:20,activations:this.engineActivations};
  }
  private carClocks = new Map<number, CarClock>(); private linkClocks = new Map<string, number>();

  get wave() { return 1 + Math.floor((this.time + 1e-8) / 20); }
  get supplyWait() { return Math.max(0, this.nextSupplyTime - this.time); }
  get enemyHealthScale() {
    const growth = Math.max(0, (this.time - 20) / 20);
    return 1 + .1 * growth + .01 * Math.pow(Math.max(0, growth - 3), 2);
  }
  get waveRhythm(): 'ordinary' | 'surge' | 'rest' { return (['ordinary', 'surge', 'rest'] as const)[(this.wave - 1) % 3]; }
  get encounterBeat() { return this.waveRhythm === 'surge' ? '密集冲击' : this.waveRhythm === 'rest' ? '短暂喘息' : '敌群涌入'; }
  get spawnRate() {
    const base = 1.8 + 1.2 * Math.min(1, this.time / 40) + Math.min(4, .25 * Math.max(0, (this.time - 40) / 20));
    return base * (this.waveRhythm === 'surge' ? 1.18 : this.waveRhythm === 'rest' ? .76 : 1);
  }
  /** Supply repair amount, exposed so presentation can state the exact recovery. */
  get repairAmount() { return 30; }
  get bossAttackInterval() { return 6; }
  get bossAttackDamage() { return Math.min(16, 8 + 2 * Math.max(0, this.wave - 3)); }
  private carAttackStats(type:CarType,level=0,mods:Partial<Record<ModId,number>>={}):CarAttackStats {
    const scale=1+level*.35;
    if(type==='cannon'){const count=1+(mods.scatter||0),burst=mods.burst||0;return {damage:26*scale/Math.sqrt(count)*(burst===1?.72:burst===2?.6:1),element:'physical',count,burst,interval:.66*Math.pow(.8,mods.rapid||0),mode:'shot'};}
    if(type==='flame')return {damage:6*scale,element:'fire',count:1,interval:.2,mode:'cone'};
    if(type==='fan')return {damage:0,element:'physical',count:0,interval:.4,utility:26*scale,mode:'push'};
    if(type==='tesla')return {damage:16*scale,element:'electric',count:3,interval:.95*Math.pow(.8,mods.surge||0),mode:'targets'};
    if(type==='cryo')return {damage:4*scale,element:'ice',count:1,interval:1.6,mode:'pulse'};
    if(type==='rail'){const count=1+(mods.lanes||0);return {damage:42*scale/Math.sqrt(count),element:'physical',count,interval:1.1,mode:'shot'};}
    if(type==='acid')return {damage:3*scale,element:'acid',count:1,interval:1.4,mode:'pulse'};
    if(type==='repair')return {damage:0,element:'physical',count:0,interval:8,utility:3+level,mode:'repair'};
    if(type==='shield')return {damage:0,element:'physical',count:0,interval:10,utility:12+level*4,mode:'shield'};
    return {damage:0,element:'physical',count:0,interval:1.2,mode:'pulse'};
  }
  getCarAttackStats(index:number): CarAttackStats | null {
    const car=this.slots[index];if(!car)return null;
    const stats=this.carAttackStats(car.type,car.level,car.mods),power=this.buildPower;
    const offensive=CARS[car.type].role==='offense';
    return {...stats,damage:stats.damage*(offensive?power.weaponDamageMultiplier:power.supportPowerMultiplier),...(stats.utility===undefined?{}:{utility:stats.utility*power.supportPowerMultiplier}),interval:stats.interval/(offensive?power.attackRateMultiplier:1)};
  }
  getBaseCarAttackStats(type:CarType): CarAttackStats { return this.carAttackStats(type); }
  getCarAttackSummary(index:number): string {
    const stats=this.getCarAttackStats(index);if(!stats)return '';
    return this.attackSummary(stats);
  }
  getBaseCarAttackSummary(type:CarType): string { return this.attackSummary(this.getBaseCarAttackStats(type)); }
  getCarSynergySummary(index:number): string { return crossfeedSummary(this.slots,index); }
  getCarCooldown(index:number): number { const car=this.slots[index];return car?Math.max(0,this.carClocks.get(car.id)?.cooldown||0):0; }
  private attackSummary(stats:CarAttackStats) {
    if(stats.mode==='push')return `伤害 0 · 推力 ${Math.round(stats.utility!)} · ${stats.interval.toFixed(2)}秒`;
    if(stats.mode==='repair')return `修复 ${Math.round(stats.utility!)} · ${stats.interval.toFixed(2)}秒`;
    if(stats.mode==='shield')return `充盾 ${Math.round(stats.utility!)} · ${stats.interval.toFixed(2)}秒`;
    if(!stats.damage)return `伤害 0 · 脉冲 ${stats.interval.toFixed(2)}秒`;
    const prefix=stats.mode==='targets'?`至多${stats.count}目标 × `:stats.mode==='cone'?'火流 ':stats.mode==='pulse'?'脉冲 ':stats.count>1?`${stats.count}发 × `:'单发 ';
    const burst=stats.burst?` · ${stats.burst+1}连射`:'';
    return `${prefix}${Number(stats.damage.toFixed(1))} · ${stats.interval.toFixed(2)}秒${burst}`;
  }
  get boss(): Enemy | null { return this.enemies.find(e => e.kind === 3 && e.hp > 0) || null; }
  get links(): { index: number; recipe: Recipe; driver: number; support: number }[] {
    const result: { index: number; recipe: Recipe; driver: number; support: number }[] = [];
    for (let i = 0; i < SLOT_Y.length - 1; i++) {
      const a = this.slots[i], b = this.slots[i + 1];
      const recipe = a && b ? getRecipe(a.type, b.type) : null;
      if (recipe) {
        const driver = a!.type === recipe.executor ? i : i + 1;
        result.push({ index: i, recipe, driver, support: driver === i ? i + 1 : i });
      }
    }
    return result;
  }
  /** A readable run-level archetype derived from the live train, used by HUD and station advice. */
  get buildIdentity() { return deriveBuildIdentity(this.slots, this.links.length); }
  get buildProgressionSnapshot(): BuildProgressionSnapshot {
    return {
      slots: this.slots.map(car => car ? { type: car.type, level: car.level, mods: { ...car.mods } } : null),
      links: this.links.length,
      uniqueRecipes: this.seenRecipes.size,
      linkActivations: this.linkActivationCount,
      bossKills: this.bossKillCount,
      kills: this.kills,
      supplyCount: this.supplyCount,
      time: this.time,
    };
  }
  get buildProgression(): BuildProgressionState { return evaluateBuildProgression(this.buildProgressionSnapshot); }
  /** Only the equipped branch applies. Damage is captured before a shot enters flight. */
  get buildPower(): BuildPowerState {
    const progression=this.buildProgression,identity=progression.identity;
    const tier=progression.milestones.filter(m=>m.completed).length;
    const eligible=tier===3&&(identity==='链式共鸣'||identity==='火力编队'||identity==='全域支援');
    const active=eligible&&this.formationRemaining>1e-8&&this.formationIdentity===identity;
    const sum=(effect:'weaponDamageMultiplier'|'linkDamageMultiplier'|'supportPowerMultiplier'|'scrapMultiplier')=>progression.passives.reduce((value,p)=>value+(p.active?(p.effects[effect]||0):0),1);
    const weaponDamageMultiplier=sum('weaponDamageMultiplier')+(active&&identity==='火力编队'?.35:0);
    const linkDamageMultiplier=sum('linkDamageMultiplier')+(active&&identity==='链式共鸣'?.45:0);
    const supportPowerMultiplier=sum('supportPowerMultiplier')+(active&&identity==='全域支援'?.50:0);
    const scrapMultiplier=sum('scrapMultiplier')+(this.configuredLoadout?.module==='salvager'?.10:0);
    const name=identity==='链式共鸣'?'共振过载':identity==='火力编队'?'火力超载':identity==='全域支援'?'护航脉冲':'编队待成型';
    const description=identity==='链式共鸣'?'联动增伤45% · 发动加快35%':identity==='火力编队'?'武器增伤35% · 射速加快25%':identity==='全域支援'?'支援增强50% · 每秒修复1、充盾2':'完成专属编队三项里程碑后开启过载';
    const parts=[weaponDamageMultiplier>1?`武器 +${Math.round((weaponDamageMultiplier-1)*100)}%`:'',linkDamageMultiplier>1?`联动 +${Math.round((linkDamageMultiplier-1)*100)}%`:'',supportPowerMultiplier>1?`支援 +${Math.round((supportPowerMultiplier-1)*100)}%`:'',scrapMultiplier>1?`废料 +${Math.round((scrapMultiplier-1)*100)}%`:''].filter(Boolean);
    return {identity,tier,summary:parts.join(' · ')||'完成里程碑获得编队加成',weaponDamageMultiplier,linkDamageMultiplier,supportPowerMultiplier,scrapMultiplier,attackRateMultiplier:active&&identity==='火力编队'?1.25:1,linkRateMultiplier:active&&identity==='链式共鸣'?1.35:1,
      overdrive:{name,description,eligible,active,remaining:active?this.formationRemaining:0,cooldown:Math.max(0,18-this.formationCharge)+(!active?this.formationRemaining:0),duration:4,chargeTime:18}};
  }
  private get attackPower() { return this.stepPower || this.buildPower; }
  private updateFormation(dt:number) {
    if(this.formationRemaining>1e-8){
      this.formationRemaining=Math.max(0,this.formationRemaining-dt);
      if(this.buildPower.overdrive.active&&this.formationIdentity==='全域支援'){
        this.formationPulse+=dt;
        if(this.formationPulse>=1-1e-8){this.formationPulse-=1;this.healTrain(1,-1);this.chargeShield(2,-1);}
      }
      return;
    }
    const power=this.buildPower;
    if(!power.overdrive.eligible)return;
    this.formationCharge+=dt;
    if(this.formationCharge<18-1e-8)return;
    this.formationCharge=0;this.formationRemaining=4;this.formationIdentity=power.identity;this.formationPulse=0;
    if(power.identity==='全域支援'){this.healTrain(1,-1);this.chargeShield(2,-1);}
    this.effects.push({type:'build-overdrive',x:0,y:-180,size:120,source:power.identity});
    this.events.push({type:'build_overdrive',time:this.time,value:power.identity});
  }
  private arc(from: number, to: number) { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }
  getRenderAngle(slot: number) {
    const car = this.slots[slot]; if (!car) return 0;
    if (this.phase !== 'combat') return car.angle;
    return car.previousAngle + this.arc(car.previousAngle, car.angle) * Math.min(1, Math.max(0, this.accumulator * 30));
  }
  private freezeInterpolation() { this.accumulator = 0; for (const car of this.slots) if (car) car.previousAngle = car.angle; }
  private random() { let s = this.seed; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.seed = s >>> 0; return this.seed / 4294967296; }
  private shuffle<T>(input: T[]): T[] {
    const values = input.slice();
    for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
    return values;
  }
  private makeCar(type: CarType): Car {
    const car: Car = { id: this.nextId++, type, angle: 0, previousAngle: 0, flash: 0, level: 0, mods: {} };
    this.carClocks.set(car.id, { cooldown: 0, targetId: null }); return car;
  }
  start(seed = 137, deferEncounter = false, loadout?: RunLoadout) {
    this.configuredLoadout=loadout===undefined?null:normalizeLoadout(loadout);
    this.engineClock=20;this.engineActivations=0;this.regionOrdinal=0;
    this.phase = 'combat'; this.previous = 'combat'; this.time = 0; this.hp = this.maxHp = 100+(this.configuredLoadout?.module==='plating'?15:0); this.kills = this.scrap = 0;
    this.seed = seed >>> 0 || 137; this.initialSeed = this.seed; this.nextId = 0; this.accumulator = this.spawnClock = this.bossClock = this.waveIndex = 0;
    this.enemies = []; this.vortices = []; this.projectiles = []; this.effects = []; this.events = []; this.seenRecipes.clear();
    this.carClocks.clear(); this.linkClocks.clear(); this.slots = SLOT_Y.map(() => null); this.slots[0] = this.makeCar(this.configuredLoadout?ENGINES[this.configuredLoadout.engine].starter:'cannon');
    this.pendingCar = null; this.offers = []; this.supplyCount = 0; this.nextScrap = REWARDS[0]; this.linkLevel = 0;
    this.nextSupplyTime = 0;
    this.rewardState=null;this.rewardQueue=[];this.carBag=[];this.earnedCarRewards=0;this.previousCarThreshold=0;this.nextModifierTime=MODIFIER_INTERVAL;
    this.stationChoices = false; this.stationCount = 0; this.route = null; this.routeSpawns = 0; this.escortAt = Infinity;
    this.passiveRepairClock = 0;
    this.linkActivationCount = this.bossKillCount = this.scrapRemainder = this.formationCharge = this.formationRemaining = this.formationPulse = 0;
    this.formationIdentity = null; this.stepPower = null;
    this.shieldHp = this.configuredLoadout?.module==='capacitor'?8:0;
    this.bossSpawned = false; this.bossCharge = 0; this.endReason = ''; this.nextBossWave = 3; this.burstQueue = []; this.firstStationCleared = this.milestoneSupply = false; this.introducedEnemyKinds.clear(); this.mainDamageSource = ''; this.damageBySource = {}; this.revision++;
    this.events.push({ type: 'run_start', time: 0 });
    this.encounterStarted = false;
    if (!deferEncounter) this.startEncounter();
  }
  /** The presentation calls this after arrival; pause/re-entry cannot spawn the opening pack twice. */
  startEncounter(): boolean {
    if (this.encounterStarted || this.phase !== 'combat') return false;
    this.encounterStarted = true;
    for (let i = 0; i < 5; i++) this.spawn(true);
    return true;
  }
  seedSeenRecipes(ids: string[]) { for (const id of ids) if (RECIPES.some(r => r.id === id)) this.seenRecipes.add(id); }
  private linkKey(index: number, recipe: Recipe) {
    const a = this.slots[index]!.id, b = this.slots[index + 1]!.id;
    return `${Math.min(a,b)}:${Math.max(a,b)}:${recipe.id}`;
  }
  private syncStructure() {
    this.shieldHp=Math.min(this.shieldHp,this.maxShield);
    const ids = new Set(this.slots.filter((c): c is Car => !!c).map(c => c.id));
    for (const id of this.carClocks.keys()) if (!ids.has(id)) this.carClocks.delete(id);
    // Retain pair cooldowns across moves and temporary gaps; only scrapping a car removes its history.
    for (const key of this.linkClocks.keys()) {
      const [a,b] = key.split(':').map(Number);
      if (!ids.has(a) || !ids.has(b)) this.linkClocks.delete(key);
    }
    this.burstQueue = this.burstQueue.filter(shot => ids.has(shot.ownerId));
    this.freezeInterpolation(); this.revision++;
  }
  private validSlot(index: number) { return Number.isInteger(index) && index >= 0 && index < SLOT_Y.length; }
  openWorkshop(): boolean {
    if (this.phase !== 'combat' && !(this.phase === 'paused' && (this.previous === 'combat' || this.previous === 'workshop'))) return false;
    this.phase = 'workshop'; this.freezeInterpolation(); this.revision++; return true;
  }
  install(index: number): boolean {
    if (this.phase !== 'workshop' || !this.pendingCar || !this.validSlot(index)) return false;
    if (this.slots[index]) {
      const right = this.slots.indexOf(null, index + 1);
      const left = index > 0 ? this.slots.lastIndexOf(null, index - 1) : -1;
      if (right >= 0) {
        for (let i = right; i > index; i--) this.slots[i] = this.slots[i - 1];
      } else if (left >= 0) {
        for (let i = left; i < index; i++) this.slots[i] = this.slots[i + 1];
      }
      // With no empty slot, only the clicked car is scrapped. Otherwise every old object survives.
    }
    this.slots[index] = this.makeCar(this.pendingCar); this.pendingCar = null;
    this.events.push({ type: 'car_installed', time: this.time, value: `${index}:${this.slots[index]!.type}` });
    this.effects.push({ type: 'upgrade', x: 0, y: SLOT_Y[index], size: 70, carSlot: index }); this.syncStructure(); return true;
  }
  swapSlots(a: number, b: number): boolean {
    if (this.phase !== 'workshop' || this.pendingCar || !this.validSlot(a) || !this.validSlot(b) || a === b) return false;
    [this.slots[a], this.slots[b]] = [this.slots[b], this.slots[a]];
    this.events.push({ type: 'cars_swapped', time: this.time, value: `${a}:${b}` }); this.syncStructure(); return true;
  }
  discardOffer(): boolean {
    if (this.phase !== 'workshop' || !this.pendingCar) return false;
    this.pendingCar = null; this.revision++; return true;
  }
  /** Consume the pending duplicate and improve the selected existing car without replacing its identity or state. */
  mergePending(index: number): boolean {
    if (this.phase !== 'workshop' || !this.pendingCar || !this.validSlot(index)) return false;
    const car = this.slots[index];
    if (!car || car.type !== this.pendingCar) return false;
    car.level++;
    car.mods[this.numericModFor(car.type)] = car.level;
    this.pendingCar = null;
    this.effects.push({ type: 'upgrade', x: 0, y: SLOT_Y[index], size: 85, carSlot: index });
    this.events.push({ type: 'car_merged', time: this.time, value: `${index}:${car.type}:${car.level}` });
    this.syncStructure(); return true;
  }
  resumeWorkshop(): boolean {
    if (this.phase !== 'workshop' || this.pendingCar) return false;
    this.phase = 'combat'; this.freezeInterpolation(); this.revision++; return true;
  }
  private availableMods(): ModId[] {
    return (Object.keys(MODS) as ModId[]).filter(id => {
      const target = MODS[id].target;
      return target === 'links' ? this.links.length > 0 : this.slots.some(car => car && car.type === target && (!MODS[id].mode || (car.mods[id] || 0) < 2));
    });
  }
  private numericModFor(type: CarType): ModId {
    return ({ cannon: 'caliber', flame: 'fuel', fan: 'pressure', tesla: 'voltage', cryo: 'coolant', rail: 'railpower', prism: 'prismfocus', acid: 'acidpotency', repair:'repairkit',shield:'capacitor' } as Record<CarType, ModId>)[type];
  }
  /** A shuffled bag gives each carriage one appearance per cycle, regardless of loadout. */
  private drawCars(): Offer[] {
    const selected: CarType[]=[];
    if(this.carBag.length<3)this.carBag.push(...this.shuffle([...CAR_TYPES]));
    while(selected.length<3){
      const index=this.carBag.findIndex(type=>!selected.includes(type));
      selected.push(this.carBag.splice(index,1)[0]);
    }
    return selected.map(id=>({kind:'car',id}));
  }
  private collectRewards() {
    while(this.scrap>=this.nextScrap){
      this.rewardQueue.push({kind:'car',source:'xp',title:'车厢升级'});
      this.previousCarThreshold=this.nextScrap;
      this.earnedCarRewards++;
      const extra=Math.max(0,this.earnedCarRewards-REWARDS.length+1);
      this.nextScrap=REWARDS[this.earnedCarRewards]??(220+90*extra+10*extra*(extra+1)/2);
    }
    while(this.time+1e-8>=this.nextModifierTime){
      this.rewardQueue.push({kind:'mod',source:'timer',title:'定时改装'});
      this.nextModifierTime+=MODIFIER_INTERVAL;
    }
    if(this.rewardQueue.length&&this.supplyWait<=1e-8)this.supply(this.rewardQueue.shift()!);
  }
  private supply(reward:RewardState={kind:'car',source:'xp',title:'车厢升级'}) {
    this.rewardState={...reward};
    this.offers=reward.kind==='car'?this.drawCars():this.shuffle(this.availableMods()).slice(0,3).map(id=>({kind:'mod',id}));
    this.stationChoices=false;
    this.milestoneSupply=reward.source==='elite';
    if(reward.kind==='mod'){
      this.stationCount++;
      this.events.push({type:'station_arrival',time:this.time,value:String(this.stationCount)});
      if(this.route)this.events.push({type:'route_completed',time:this.time,value:this.route});
      this.route=null;this.routeSpawns=0;this.escortAt=Infinity;
    }
    this.supplyCount++;
    this.nextSupplyTime=this.time+1;
    this.phase='supply';this.revision++;
    this.events.push({type:'supply_offer',time:this.time,value:`${this.supplyCount}:${reward.source}:${reward.kind}`});
  }
  chooseOffer(index: number): boolean {
    if (this.phase !== 'supply' || !Number.isInteger(index) || index < 0 || index >= this.offers.length) return false;
    const offer = this.offers[index];
    const station = this.stationChoices;
    if (offer.kind === 'car') {
      if (!CAR_TYPES.includes(offer.id as CarType)) return false;
      this.pendingCar = offer.id as CarType; this.phase = 'workshop';
    } else if (offer.kind === 'mod') {
      const id = offer.id as ModId;
      if (!this.availableMods().includes(id)) return false;
      const target = MODS[id].target;
      if (target === 'links') this.linkLevel++;
      else for (const car of this.slots) if (car?.type === target) {
        if (MODS[id].mode) car.mods[id] = Math.min(2, (car.mods[id] || 0) + 1);
        else { car.level++; car.mods[id] = car.level; }
      }
      this.effects.push({ type: 'upgrade', x: 0, y: -145, size: 100 }); this.phase = 'combat';
    } else {
      if (offer.id !== 'repair') return false;
      const healed = Math.min(this.maxHp - this.hp, offer.amount ?? this.repairAmount);
      this.hp += healed;
      this.effects.push({ type: 'repair', x: 0, y: -145, size: healed }); this.phase = 'combat';
    }
    if (station) {
      this.route = offer.kind === 'car' ? 'cargo' : offer.kind === 'mod' ? 'arsenal' : 'repair';
      this.routeSpawns = 0;
      this.escortAt = this.route === 'arsenal' ? this.time + 3 : Infinity;
      this.stationChoices = false;
      this.events.push({ type: 'station_chosen', time: this.time, value: `${this.route}:${offer.id}` });
    }
    this.events.push({ type: 'offer_chosen', time: this.time, value: `${offer.kind}:${offer.id}` });
    if (this.milestoneSupply) { this.milestoneSupply = false; this.events.push({ type: 'milestone_reward_claimed', time: this.time }); }
    this.offers = []; this.rewardState=null; this.freezeInterpolation(); this.revision++; return true;
  }
  pause() { if (this.phase === 'combat' || this.phase === 'supply' || this.phase === 'workshop') { this.previous = this.phase; this.phase = 'paused'; this.freezeInterpolation(); } }
  resume() { if (this.phase === 'paused') { this.phase = this.previous; this.freezeInterpolation(); } }
  /** Clamp real frame time before scaling. Modal boundaries discard any unused simulation time. */
  advance(delta: number, speed = 1): number {
    if (this.phase !== 'combat' || !this.encounterStarted) return 0;
    this.accumulator += (Number.isFinite(delta) ? Math.min(.1, Math.max(0, delta)) : 0) * (speed === 2 || speed === 4 ? speed : 1);
    let steps = 0;
    while (this.accumulator + 1e-10 >= 1 / 30 && this.phase === 'combat') {
      this.accumulator = Math.max(0, this.accumulator - 1 / 30); this.step(1 / 30); steps++;
    }
    if (this.phase !== 'combat') this.freezeInterpolation();
    return steps / 30;
  }
  private spawn(near = false, forcedKind?: number, healthMultiplier = 1) {
    if (this.enemies.length >= (this.boss ? 100 : 99)) return;
    const roll = this.random();
    // Introduce counters on the same schedule as the accepted pacing candidate.
    const kind = forcedKind ?? (this.configuredLoadout ? selectWorldEnemy(this.time,roll) : (roll < .30 ? 0 : roll < .48 ? (this.time >= 12 ? 1 : 0) : roll < .60 ? (this.time >= 18 ? 2 : 0) : roll < .70 ? (this.time >= 30 ? 4 : 0) : roll < .80 ? (this.time >= 38 ? 5 : 0) : roll < .87 ? (this.time >= 44 && this.wave >= 2 ? 6 : 0) : roll < .94 ? (this.time >= 50 && this.wave >= 3 ? 7 : 0) : (this.time >= 56 && this.wave >= 4 ? 8 : 0)));
    const hp = (kind === 1 ? 17 : kind === 2 ? 48 : kind === 6 ? 35 : kind === 7 ? 42 : kind === 8 ? 50 : kind === 4 ? 30 : kind === 5 ? 32 : 24) * this.enemyHealthScale * healthMultiplier;
    this.enemies.push({ id: this.nextId++, x: (this.random() > .5 ? 1 : -1) * (near ? 185 + this.random() * 75 : 370 + this.random() * 25),
      y: -360 + this.random() * 680, hp, maxHp: hp, speed: kind === 1 ? 61 : kind === 2 ? 27 : 34, kind, flash: 0, barrier: kind === 6 ? 20 * this.enemyHealthScale : 0, regenClock: 2 });
    if(!this.introducedEnemyKinds.has(kind)){
      this.introducedEnemyKinds.add(kind);
      this.effects.push({type:'enemy-introduced',x:0,y:260,size:kind,enemyKind:kind});
      this.events.push({type:'enemy_introduced',time:this.time,value:String(kind)});
    }
  }
  private spawnBoss() {
    if(this.boss)return;
    this.bossSpawned = true; this.bossClock = 0; this.bossCharge = 0; this.nextBossWave = this.wave + 3;
    const growth = Math.max(0, (this.time - 40) / 60);
    const hp = 700 * (1 + .45 * growth + .08 * growth * growth);
    const x=this.random()<.5?-285:285,y=-180;
    this.enemies.push({ id: this.nextId++, x, y, hp, maxHp: hp, speed: 0, kind: 3, flash: 0 });
    this.events.push({ type: 'boss_spawn', time: this.time }); this.effects.push({ type: 'boss', x, y, size: 70 });
  }
  private bossRange(index: number): number {
    const car=this.slots[index]!;
    if(car.type==='fan'||car.type==='prism')return -1; // Boss is immune to the fan's independent push.
    let range=car.type==='rail'?1240:car.type==='cannon'?780:car.type==='flame'?240*this.reach(car):car.type==='tesla'?550:car.type==='acid'?260:245;
    for(const link of this.links)if(link.driver===index){
      const id=link.recipe.id;
      range=Math.max(range,id==='cannon-fan'?1240:id==='cannon-cryo'?780:id==='flame-fan'?510*this.reach(car):Infinity);
    }
    return range;
  }
  private target(x: number, y: number, lockedId: number | null = null, bossRange = Infinity): Enemy | undefined {
    const boss=this.boss;
    const live = this.enemies.filter(e => e.hp > 0 && e.kind!==3).sort((a,b) => Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
    // A close collision threat takes precedence over a boss. Within a priority
    // group the prior lock still prevents target and muzzle jitter.
    const imminent = live.filter(e => Math.abs(e.x) <= 118);
    if (!imminent.length && boss && Math.hypot(boss.x-x,boss.y-y)<=bossRange) return boss;
    const candidates = imminent.length ? imminent : live;
    const nearest = candidates[0], locked = candidates.find(e => e.id === lockedId);
    return nearest && locked && Math.hypot(locked.x-x,locked.y-y) <= Math.hypot(nearest.x-x,nearest.y-y)*1.3+20 ? locked : nearest;
  }
  private step(dt: number) {
    this.time += dt;
    if(this.configuredLoadout){
      const world=this.worldState,ordinal=world.cycle*WORLD_IDS.length+world.index;
      if(ordinal!==this.regionOrdinal){
        this.regionOrdinal=ordinal;
        this.effects.push({type:'region',x:0,y:260,size:world.index,source:world.id});
        this.events.push({type:'region_enter',time:this.time,value:world.id});
      }
    }
    this.updateFormation(dt);
    this.stepPower=this.buildPower;
    try { this.stepSimulation(dt); } finally { this.stepPower=null; }
  }
  private stepSimulation(dt: number) {
    if (this.wave >= this.nextBossWave && !this.boss) this.spawnBoss();
    if (this.wave > this.waveIndex) {
      this.waveIndex = this.wave; this.effects.push({type:'wave',x:0,y:260,size:this.wave,source:this.waveRhythm});
      this.events.push({type:'wave',time:this.time,value:`${this.wave}:${this.waveRhythm}`});
    }
    this.spawnClock += dt * this.spawnRate; while (this.spawnClock >= 1) {
      this.spawnClock--; this.spawn();
      if (this.route === 'cargo' && ++this.routeSpawns % 4 === 0) {
        this.spawn(false, 0);
        this.events.push({ type: 'route_reinforcement', time: this.time, value: 'cargo' });
      }
    }
    if (this.time + 1e-8 >= this.escortAt && this.enemies.length < 99) {
      this.spawn(false, 2, 2); this.escortAt = Infinity;
      this.events.push({ type: 'route_escort', time: this.time, value: 'arsenal' });
      this.effects.push({ type: 'wave', x: 0, y: 260, size: this.wave, source: 'arsenal' });
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.corrosion = Math.max(0,(e.corrosion||0)-dt);
      e.flash = Math.max(0,e.flash-dt); e.slow = Math.max(0,(e.slow||0)-dt); e.freeze = Math.max(0,(e.freeze||0)-dt); e.armorBreak = Math.max(0,(e.armorBreak||0)-dt);
      if ((e.burn || 0) > 0) {
        e.burn = Math.max(0,e.burn!-dt); e.burnClock = (e.burnClock ?? .5)-dt;
        if (e.burnClock <= .00001) { e.burnClock += .5; this.hit(e,e.burnDamage || 0,'fire',e.x-1,e.y); }
      }
      if(e.kind===8) { e.regenClock=(e.regenClock??2)-dt; if(e.regenClock<=0){e.regenClock+=2;if(!(e.burn!>0)&&e.hp>0){const healed=Math.min(e.maxHp-e.hp,e.maxHp*.08);e.hp+=healed;if(healed>0)this.effects.push({type:'regen',x:e.x,y:e.y,size:healed});}} }
      if (e.hp <= 0 || e.kind === 3) continue;
      const tx = Math.sign(e.x)*42, ty = Math.max(SLOT_Y[SLOT_Y.length - 1],Math.min(120,e.y));
      const dx = tx-e.x, dy = ty-e.y, distance = Math.hypot(dx,dy);
      if (distance < 14) { e.hp = 0; this.damageTrain(e.kind===2?10:5,`enemy:${e.kind}`); }
      else { const speed = (e.freeze!>0?0:e.slow!>0?.5:1)*e.speed; e.x += dx/distance*speed*dt; e.y += dy/distance*speed*dt; }
    }
    if (this.hp <= 0) return this.finish('lose','armor');
    this.updateEngine(dt);
    for(const shot of this.burstQueue)shot.delay-=dt;
    for(const shot of this.burstQueue.filter(s=>s.delay<=1e-8)) { const slot=this.slots.findIndex(c=>c?.id===shot.ownerId);if(slot>=0){this.projectile(slot,'cannon',shot.damage,'physical',shot.angle);this.projectiles[this.projectiles.length-1].radius=shot.radius;this.effects.push({type:'fire',x:0,y:SLOT_Y[slot],size:18,dx:Math.cos(shot.angle),dy:Math.sin(shot.angle),carSlot:slot});}}
    this.burstQueue=this.burstQueue.filter(s=>s.delay>1e-8);
    for (let i=0;i<SLOT_Y.length;i++) if(this.slots[i]) this.updateCar(i,dt);
    for (const [key,cooldown] of this.linkClocks) this.linkClocks.set(key,Math.max(0,cooldown-dt*this.attackPower.linkRateMultiplier));
    for (const link of this.links) {
      const key = this.linkKey(link.index,link.recipe);
      let cooldown = this.linkClocks.get(key) ?? 0;
      if(cooldown<=0 && this.triggerLink(link.index,link.recipe)) cooldown = this.linkInterval(link.recipe.id);
      this.linkClocks.set(key,cooldown);
    }
    this.moveProjectiles(dt); this.moveVortices(dt);
    this.enemies = this.enemies.filter(e=>e.hp>0);
    if(!this.boss)this.bossCharge=0;
    if(this.boss) {
      const priorCharge=this.bossCharge;
      this.bossClock += dt; this.bossCharge = Math.min(1,this.bossClock/this.bossAttackInterval);
      if(priorCharge<.72&&this.bossCharge>=.72) { this.effects.push({type:'boss-charge',x:this.boss.x,y:this.boss.y,size:70,source:'boss'});this.events.push({type:'boss_charge_start',time:this.time}); }
      if(this.bossClock>=this.bossAttackInterval-.00001) { this.bossClock-=this.bossAttackInterval;this.bossCharge=0;this.damageTrain(this.bossAttackDamage,'boss_slam');this.effects.push({type:'slam',x:0,y:40,size:130,source:'boss',damage:this.bossAttackDamage});this.events.push({type:'boss_slam',time:this.time,value:String(this.bossAttackDamage)}); }
    }
    if(this.hp<=0) return this.finish('lose','armor');
    if(this.hp<this.maxHp){
      this.passiveRepairClock+=dt;
      if(this.passiveRepairClock>=5-1e-8){
        this.passiveRepairClock=Math.max(0,this.passiveRepairClock-5);
        const healed=Math.min(1,this.maxHp-this.hp);this.hp+=healed;
        this.effects.push({type:'passive-repair',x:0,y:-145,size:healed});
      }
    }else this.passiveRepairClock=0;
    if(this.phase==='combat') this.collectRewards();
  }
  getCarRange(slot:number):number { const car=this.slots[slot];if(!car)return 0;return car.type==='flame'?240*this.reach(car):car.type==='cannon'?780:car.type==='rail'?1240:car.type==='tesla'?550:car.type==='fan'?250:car.type==='cryo'?245:car.type==='acid'?260:100; }
  private updateEngine(dt:number) {
    if(!this.configuredLoadout)return;
    this.engineClock-=dt;
    if(this.engineClock>1e-8)return;
    this.engineClock+=20;this.engineActivations++;
    const id=this.configuredLoadout.engine,source=`engine:${id}`,y=145;
    if(id==='dawn'){
      const target=this.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x,a.y-y)-Math.hypot(b.x,b.y-y))[0];
      const aim=target?Math.atan2(target.y-y,target.x):Math.PI/2;
      for(const spread of [-.14,0,.14]){
        const angle=aim+spread;
        this.projectiles.push({id:this.nextId++,x:0,y,dx:Math.cos(angle)*390,dy:Math.sin(angle)*390,life:2,radius:8,kind:'cannon',damage:18,element:'physical',source,hitIds:[]});
      }
    }else if(id==='storm'){
      const targets=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x,e.y-y)<=620).sort((a,b)=>Math.hypot(a.x,a.y-y)-Math.hypot(b.x,b.y-y)).slice(0,3);
      for(const enemy of targets){
        this.effects.push({type:'tesla',x:0,y,dx:enemy.x,dy:enemy.y-y,size:22,source});
        this.hit(enemy,20,'electric',0,y,undefined,undefined,source);
      }
    }else{
      this.healTrain(3,-1);this.chargeShield(12,-1);
    }
    this.effects.push({type:'locomotive-skill',x:0,y,size:95,source:id});
    this.events.push({type:'locomotive_skill',time:this.time,value:id});
  }
  private reach(car:Car) { return 1 + .25 * (car.mods.reach || 0); }
  private basicShots(index:number,kind:string,damage:number) {
    const car=this.slots[index]!,count=1+(car.mods[kind==='pierce'?'lanes':'scatter']||0),burst=kind==='cannon'?(car.mods.burst||0):0;
    const perShot=damage/Math.sqrt(count)*(burst===1?.72:burst===2?.6:1),radius=(kind==='cannon'?8:12)/Math.sqrt(count);
    for(let i=0;i<count;i++){
      const angle=car.angle+(kind==='cannon'?(i-(count-1)/2)*.16:0);
      this.projectile(index,kind,perShot,'physical',angle);const p=this.projectiles[this.projectiles.length-1];p.radius=radius;
      if(kind==='pierce'){const offset=(i-(count-1)/2)*28;p.x-=Math.sin(angle)*offset;p.y+=Math.cos(angle)*offset;}
      for(let j=1;j<=burst&&this.burstQueue.length<60;j++)this.burstQueue.push({ownerId:car.id,delay:.12*j,angle,damage:perShot,radius});
    }
  }
  private updateCar(index:number,dt:number) {
    const car=this.slots[index]!, clock=this.carClocks.get(car.id)!;const y=SLOT_Y[index];
    const power=this.attackPower,offensive=CARS[car.type].role==='offense';
    car.previousAngle=car.angle;car.flash=Math.max(0,car.flash-dt);clock.cooldown-=dt*(offensive?power.attackRateMultiplier:1);
    if(car.type==='repair'||car.type==='shield'){
      if(clock.cooldown<=0){
        clock.cooldown=car.type==='repair'?8:10;car.flash=.3;
        if(car.type==='repair')this.healTrain((3+car.level)*power.supportPowerMultiplier,index);
        else this.chargeShield((12+car.level*4)*power.supportPowerMultiplier,index);
      }
      return;
    }
    const target=this.target(0,y,clock.targetId,this.bossRange(index));clock.targetId=target?.id??null;if(!target)return;
    const desired=Math.atan2(target.y-y,target.x),error=this.arc(car.angle,desired);
    car.angle=this.arc(0,car.angle+Math.max(-10*dt,Math.min(10*dt,error*(1-Math.exp(-20*dt)))));
    if(clock.cooldown>0)return;
    const scale=(1+car.level*.35)*(offensive?power.weaponDamageMultiplier:power.supportPowerMultiplier), aligned=Math.abs(this.arc(car.angle,desired))<.2;
    if((car.type==='cannon'||car.type==='flame'||car.type==='fan'||car.type==='rail')&&!aligned)return;
    car.flash=.15;
    if(car.type==='cannon') { clock.cooldown=.66*Math.pow(.8,car.mods.rapid||0);this.basicShots(index,'cannon',26*scale);this.directionEffect('fire',index,18); }
    else if(car.type==='flame') { clock.cooldown=.2;this.cone(index,car.angle,240*this.reach(car),.56,6*scale,'fire');this.directionEffect('flame',index,240*this.reach(car)); }
    else if(car.type==='fan') {
      clock.cooldown=.4;this.directionEffect('fan',index,250);
      for(const e of this.enemies) if(e.hp>0&&e.kind!==3&&Math.hypot(e.x,e.y-y)<250&&Math.abs(this.arc(car.angle,Math.atan2(e.y-y,e.x)))<.95)this.push(e,0,y,26*scale);
    } else if(car.type==='tesla') {
      clock.cooldown=.95*Math.pow(.8,car.mods.surge||0);
      const targets=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x,e.y-y)<550).sort((a,b)=>Math.hypot(a.x,a.y-y)-Math.hypot(b.x,b.y-y)).slice(0,3);
      for(const e of targets){this.effects.push({type:'tesla',x:0,y,dx:e.x,dy:e.y-y,size:16*scale,carSlot:index});this.hit(e,16*scale,'electric',0,y,undefined,index);}
    } else if(car.type==='rail') {
      clock.cooldown=1.1;this.basicShots(index,'pierce',42*scale);this.directionEffect('pierce',index,30);
    } else if(car.type==='prism') {
      clock.cooldown=1.2;this.effects.push({type:'prism',x:0,y,size:100,carSlot:index});
    } else if(car.type==='acid') {
      clock.cooldown=1.4;this.effects.push({type:'acid',x:0,y,size:260,carSlot:index});
      for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x,e.y-y)<260){e.corrosion=3*power.supportPowerMultiplier;this.hit(e,3*scale,'acid',0,y,undefined,index);}
    } else {
      clock.cooldown=1.6;this.effects.push({type:'cryo',x:0,y,size:245,carSlot:index});
      for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x,e.y-y)<245){this.chill(e,1.8*power.supportPowerMultiplier);this.hit(e,4*scale,'ice',0,y,undefined,index);}
    }
  }
  private directionEffect(type:string,index:number,size:number,recipeId?:string) {
    const car=this.slots[index]!;this.effects.push({type,x:0,y:SLOT_Y[index],size,dx:Math.cos(car.angle),dy:Math.sin(car.angle),carSlot:index,recipeId});
  }
  private cone(index:number,angle:number,range:number,width:number,damage:number,element:DamageType,recipeId?:string) {
    const y=SLOT_Y[index];
    for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x,e.y-y)<range&&Math.abs(this.arc(angle,Math.atan2(e.y-y,e.x)))<width){if(element==='fire')this.ignite(e,damage*.3);this.hit(e,damage,element,0,y,recipeId,index);}
  }
  private projectile(index:number,kind:string,damage:number,element:DamageType,angle:number,recipeId?:string,burnDamage?:number) {
    const speed=kind==='pierce'?620:650;
    const beam=this.slots[index]?.type==='rail'&&kind==='pierce';
    this.projectiles.push({id:this.nextId++,x:0,y:SLOT_Y[index],dx:Math.cos(angle)*speed,dy:Math.sin(angle)*speed,life:beam?.18:2,radius:kind==='cannon'?8:12,kind,damage,element,recipeId,carSlot:index,hitIds:[],burnDamage,beam});
  }
  private healTrain(amount:number,slot:number) {
    if(this.hp<=0)return;
    const healed=Math.min(amount,this.maxHp-this.hp);this.hp+=healed;
    if(healed>0)this.effects.push({type:'passive-repair',x:0,y:SLOT_Y[slot]??-145,size:healed,carSlot:slot>=0?slot:undefined});
  }
  private chargeShield(amount:number,slot:number) {
    if(this.hp<=0)return;
    const added=Math.min(amount,this.maxShield-this.shieldHp);this.shieldHp+=added;
    if(added>0)this.effects.push({type:'train-shield',x:0,y:SLOT_Y[slot]??-145,size:added,carSlot:slot>=0?slot:undefined});
  }
  private damageTrain(amount:number,source='enemy_contact') {
    const absorbed=Math.min(this.shieldHp,amount);this.shieldHp-=absorbed;
    const before=this.hp;this.hp=Math.max(0,this.hp-(amount-absorbed));
    const lost=before-this.hp;
    if(lost>0){this.damageBySource[source]=(this.damageBySource[source]||0)+lost;this.mainDamageSource=this.damageLabel(Object.entries(this.damageBySource).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0] || '');}
    if(absorbed>0)this.effects.push({type:'shield-damage',x:0,y:-145,size:absorbed,source,damage:absorbed,dx:this.shieldHp});
    if(lost>0)this.effects.push({type:'damage',x:0,y:-145,size:lost,source,damage:lost});
  }
  private linkInterval(id:string) { return id.endsWith('-repair')?4:id.endsWith('-shield')?4.5:id==='flame-fan'?.5:1.6; }
  private triggerLink(index:number,recipe:Recipe):boolean {
    const a=this.slots[index]!,b=this.slots[index+1]!;
    const driver=a.type===recipe.executor?index:index+1,support=driver===index?index+1:index;
    // Multiple supports feeding one weapon create a true chain reaction.  A
    // single link keeps its old numbers; the bonus only appears when the same
    // driver has two live recipes at once, making dense layouts feel like a
    // build rather than a list of isolated pairings.
    const driverLinks=this.links.filter(l=>l.driver===driver).length;
    const chainBonus=1+.18*Math.max(0,driverLinks-1);
    const power=this.attackPower;
    const scale=(1+.2*(a.level+b.level))*(1+.25*this.linkLevel)*chainBonus*power.linkDamageMultiplier*power.supportPowerMultiplier;
    const car=this.slots[driver]!,originY=SLOT_Y[driver],target=this.target(0,originY,null,this.bossRange(driver));
    if(!target)return false;
    if(Math.abs(this.arc(car.angle,Math.atan2(target.y-originY,target.x)))>=.25)return false;
    const id=recipe.id;
    const firstProjectile=this.projectiles.length;
    this.effects.push({type:'link-feed',x:0,y:SLOT_Y[support],dx:0,dy:originY-SLOT_Y[support],size:20,carSlot:driver,recipeId:id});
    if(driverLinks>=2){
      this.effects.push({type:'chain-reaction',x:0,y:originY,size:72+driverLinks*12,carSlot:driver,recipeId:id});
    }
    if(this.slots[support]!.type==='repair'||this.slots[support]!.type==='shield'){
      if(car.type==='cannon'||car.type==='rail')this.projectile(driver,car.type==='rail'?'pierce':'cannon',18*scale,'physical',car.angle,id);
      else if(car.type==='flame'){
        this.cone(driver,car.angle,240*this.reach(car),.56,12*scale,'fire',id);
        this.directionEffect('flame',driver,240*this.reach(car),id);
      }else{
        this.effects.push({type:'tesla',x:0,y:originY,dx:target.x,dy:target.y-originY,size:18,recipeId:id,carSlot:driver});
        this.hit(target,18*scale,'electric',0,originY,id,driver);
      }
      const level=this.slots[support]!.level;
      if(this.slots[support]!.type==='repair')this.healTrain((2+level)*power.supportPowerMultiplier,driver);
      else this.chargeShield((4+level*2)*power.supportPowerMultiplier,driver);
    }else if(id==='cannon-fan') {
      this.projectile(driver,'pierce',36*scale,'physical',car.angle,id);this.directionEffect('pierce',driver,24,id);
    } else if(id==='cannon-cryo') {
      this.projectile(driver,'shatter',30*scale,'ice',car.angle,id);
      const shot=this.projectiles[this.projectiles.length-1];shot.slow=2*power.supportPowerMultiplier;shot.freeze=1.3*power.supportPowerMultiplier;
      this.directionEffect('shatter',driver,24,id);
    } else if(id==='flame-fan') {
      this.cone(driver,car.angle,510*this.reach(car),.19,52*scale,'fire',id);this.directionEffect('focused-flame',driver,510*this.reach(car),id);
    } else if(id==='flame-cryo') {
      this.effects.push({type:'link-shot',x:0,y:originY,dx:target.x,dy:target.y-originY,size:8,recipeId:id,carSlot:driver});
      this.effects.push({type:'thermal',x:target.x,y:target.y,size:105,recipeId:id,carSlot:driver});
      for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x-target.x,e.y-target.y)<=105){
        const cold=(e.slow||0)>0||(e.freeze||0)>0;
        if(cold)this.effects.push({type:'cold-shatter',x:e.x,y:e.y,size:42,recipeId:id,carSlot:driver,source:id});
        this.ignite(e,6*scale);this.hit(e,28*scale*(cold?2:1),'fire',0,originY,id,driver);
      }
    } else if(id==='fan-tesla') {
      this.effects.push({type:'link-shot',x:0,y:originY,dx:target.x,dy:target.y-originY,size:8,recipeId:id,carSlot:driver});
      this.vortices.push({id:this.nextId++,x:target.x,y:target.y,dx:0,dy:0,life:1.8,maxLife:1.8,age:0,radius:92,tick:0,damage:7*scale,kind:'electric',element:'electric',recipeId:id,carSlot:driver});
      this.effects.push({type:'electric-vortex',x:target.x,y:target.y,size:92,recipeId:id,carSlot:driver});
    } else if(id==='tesla-cryo') {
      const targets=[target,...this.enemies.filter(e=>e.hp>0&&e.id!==target.id&&Math.hypot(e.x-target.x,e.y-target.y)<=165).slice(0,3)];
      for(const e of targets){const cold=(e.slow||0)>0||(e.freeze||0)>0;this.effects.push({type:'conduction',x:0,y:originY,dx:e.x,dy:e.y-originY,size:20,recipeId:id,carSlot:driver});this.hit(e,(cold?28:16)*scale,'electric',0,originY,id,driver);this.chill(e,2*power.supportPowerMultiplier,(e===target?1:0)*power.supportPowerMultiplier);}
    }
    if(id==='rail-fan'||id==='rail-cryo') {
      this.projectile(driver,'pierce',48*scale,id==='rail-cryo'?'ice':'physical',car.angle,id);
      const p=this.projectiles[this.projectiles.length-1];
      if(id==='rail-cryo'){p.slow=2*power.supportPowerMultiplier;p.freeze=power.supportPowerMultiplier;p.frozenBonus=2;}else p.knockback=35*power.supportPowerMultiplier;
      this.directionEffect(id==='rail-cryo'?'shatter':'pierce',driver,32,id);
    } else if(this.slots[support]!.type==='prism') {
      if(car.type==='cannon'||car.type==='rail') {
        for(const offset of[-30,0,30]){this.projectile(driver,car.type==='rail'?'pierce':'cannon',(car.type==='rail'?25:18)*scale,'physical',car.angle,id);const p=this.projectiles[this.projectiles.length-1];p.x-=Math.sin(car.angle)*offset;p.y+=Math.cos(car.angle)*offset;}
        this.directionEffect('parallel-shot',driver,32,id);
      } else if(car.type==='flame') {
        for(const offset of[-.32,0,.32])this.cone(driver,car.angle+offset,330*this.reach(car),.20,22*scale,'fire',id);
        this.directionEffect('focused-flame',driver,330*this.reach(car),id);
      } else {
        const targets=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x,e.y-originY)<600).sort((a,b)=>Math.hypot(a.x,a.y-originY)-Math.hypot(b.x,b.y-originY)).slice(0,6);
        for(const e of targets){this.effects.push({type:'conduction',x:0,y:originY,dx:e.x,dy:e.y-originY,size:18,recipeId:id,carSlot:driver});this.hit(e,18*scale,'electric',0,originY,id,driver);}
      }
    } else if(this.slots[support]!.type==='acid') {
      if(car.type==='cannon'||car.type==='rail') {
        this.projectile(driver,car.type==='rail'?'pierce':'cannon',38*scale,car.type==='rail'?'acid':'physical',car.angle,id);this.projectiles[this.projectiles.length-1].corrosion=4*power.supportPowerMultiplier;this.directionEffect('acid',driver,32,id);
      } else if(car.type==='flame') {
        for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x,e.y-originY)<300*this.reach(car)&&Math.abs(this.arc(car.angle,Math.atan2(e.y-originY,e.x)))<.55){e.corrosion=4*power.supportPowerMultiplier;this.ignite(e,8*scale);this.hit(e,24*scale,'fire',0,originY,id,driver);}
        this.directionEffect('focused-flame',driver,300*this.reach(car),id);
      } else {
        const targets=[target,...this.enemies.filter(e=>e.hp>0&&e!==target&&Math.hypot(e.x-target.x,e.y-target.y)<180).slice(0,3)];
        for(const e of targets){const corroded=(e.corrosion||0)>0;e.corrosion=4*power.supportPowerMultiplier;this.effects.push({type:'conduction',x:0,y:originY,dx:e.x,dy:e.y-originY,size:22,recipeId:id,carSlot:driver});this.hit(e,(corroded?36:22)*scale,'electric',0,originY,id,driver);}
      }
    }
    // Payloads are captured on the new shots only, so rearranging in the workshop
    // cannot change ammunition already in flight. Native recipe payloads stay stronger.
    const payloads=deriveCrossfeed(this.slots,driver);
    for(let shotIndex=firstProjectile;shotIndex<this.projectiles.length;shotIndex++){
      const shot=this.projectiles[shotIndex];
      if(payloads.includes('cryo')){
        shot.slow=Math.max(shot.slow||0,2*power.supportPowerMultiplier);
        shot.freeze=Math.max(shot.freeze||0,.65*power.supportPowerMultiplier);
      }
      if(payloads.includes('acid'))shot.corrosion=Math.max(shot.corrosion||0,3*power.supportPowerMultiplier);
    }
    this.linkActivationCount++;
    if(!this.seenRecipes.has(id)){this.seenRecipes.add(id);this.effects.push({type:'discovery',x:0,y:originY,size:100,recipeId:id,carSlot:driver});this.events.push({type:'combo_discovered',time:this.time,value:id});}
    return true;
  }
  private ignite(e:Enemy,damage:number) {
    if(e.hp<=0)return;
    const active=(e.burn||0)>0;
    e.burnDamage=active?Math.max(e.burnDamage||0,damage):damage;
    e.burnClock=active?(e.burnClock??.5):.5;e.burn=2.5;
  }
  private chill(e:Enemy,slow:number,freeze=0) {if(e.kind===3||e.hp<=0)return;e.slow=Math.max(e.slow||0,slow);e.freeze=Math.max(e.freeze||0,freeze);}
  private push(e:Enemy,x:number,y:number,amount:number) {if(e.kind===3||e.hp<=0)return;const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy);if(d>.001){e.x+=dx/d*amount;e.y+=dy/d*amount;}}
  private damageLabel(source:string) {
    const recipe=RECIPES.find(entry => entry.id===source);
    if(recipe)return recipe.name;
    if(source.startsWith('engine:'))return ENGINES[source.slice(7) as EngineId]?.skillName || source;
    if(source.startsWith('car:'))return CARS[source.slice(4) as CarType]?.name || source;
    return ({'status:fire':'持续灼烧','status:ice':'冰霜余震','status:electric':'电涡余震','status:acid':'蚀酸余震','boss_slam':'首领冲击','enemy:0':'敌人撞击','enemy:1':'快速敌人撞击','enemy:2':'重甲敌人撞击','enemy:4':'灼热敌人撞击','enemy:5':'带电敌人撞击','enemy:6':'护盾敌人撞击','enemy:7':'分裂敌人撞击','enemy:8':'再生敌人撞击','enemy_contact':'敌人撞击'} as Record<string,string>)[source] || source;
  }
  private hit(e:Enemy,damage:number,element:DamageType,x:number,y:number,recipeId?:string,carSlot?:number,attackSource?:string) {
    if(e.hp<=0||damage<=0)return;
    const resistance=(e.corrosion!>0)?1:element==='physical'&&e.kind===2&&!(e.armorBreak!>0)?.45:element==='fire'&&e.kind===4?.25:element==='electric'&&e.kind===5?.25:1;
    let amount=damage*resistance;
    const source=attackSource || recipeId || (carSlot === undefined ? `status:${element}` : `car:${this.slots[carSlot]?.type || element}`);
    if((e.barrier||0)>0){const absorbed=Math.min(e.barrier!,amount*(e.corrosion!>0?.25:1));e.barrier!-=absorbed;amount-=absorbed;this.effects.push({type:'shield',x:e.x,y:e.y,size:absorbed,enemyId:e.id,enemyKind:e.kind,source,element,damage:absorbed});}
    const dealt=Math.min(e.hp,amount);e.hp-=amount;e.flash=.09;const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy);const nx=d>.001?dx/d:1,ny=d>.001?dy/d:0;
    this.effects.push({type:'hit',x:e.x,y:e.y,size:e.kind===3?10:5,dx:nx,dy:ny,enemyId:e.id,enemyKind:e.kind,recipeId,carSlot,source,element,damage:dealt});
    if(e.hp<=0){
      if(e.kind===3){
        this.bossKillCount++;
        this.rewardQueue.push({kind:'mod',source:'elite',title:'精英战利品'});
        this.bossCharge=0;this.events.push({type:'boss_killed',time:this.time,value:String(this.wave)});
        if(!this.firstStationCleared){
          this.firstStationCleared=true;this.milestoneSupply=true;this.effects.push({type:'milestone',x:e.x,y:e.y,size:100,source});this.events.push({type:'boss_defeated_supply',time:this.time,value:source});
        }
      }
      if(e.kind===7){this.effects.push({type:'brood',x:e.x,y:e.y,size:36});for(const offset of[-18,18])if(this.enemies.filter(v=>v.hp>0).length<(this.boss?100:99)){const hp=12*this.enemyHealthScale;this.enemies.push({id:this.nextId++,x:e.x+offset,y:e.y+22,hp,maxHp:hp,speed:52,kind:1,flash:0});}}
      const baseScrap=e.kind===3?5:1;
      this.scrapRemainder+=baseScrap*(this.attackPower.scrapMultiplier-1);
      const bonusScrap=Math.floor(this.scrapRemainder+1e-8);this.scrapRemainder-=bonusScrap;
      this.kills++;this.scrap+=baseScrap+bonusScrap;this.effects.push({type:'kill',x:e.x,y:e.y,size:e.kind===3?70:e.kind===2?26:16,dx:nx,dy:ny,enemyId:e.id,enemyKind:e.kind,recipeId,carSlot,source,element,damage:dealt});}
  }
  private segmentDistance(x:number,y:number,ax:number,ay:number,bx:number,by:number) {
    const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)):0;
    return Math.hypot(x-ax-t*dx,y-ay-t*dy);
  }
  private moveProjectiles(dt:number) {
    for(const p of this.projectiles){
      const ox=p.x,oy=p.y;p.life-=dt;if(p.life<=0||p.resolved)continue;
      const tx=ox+p.dx*(p.beam?2:dt),ty=oy+p.dy*(p.beam?2:dt);
      if(p.beam){p.resolved=true;this.effects.push({type:'rail-beam',x:ox,y:oy,dx:tx-ox,dy:ty-oy,size:p.radius,carSlot:p.carSlot,recipeId:p.recipeId});}
      else {p.x=tx;p.y=ty;}
      const touched=this.enemies.filter(e=>e.hp>0&&!p.hitIds.includes(e.id)&&this.segmentDistance(e.x,e.y,ox,oy,tx,ty)<=p.radius+(e.kind===3?48:12)).sort((a,b)=>Math.hypot(a.x-ox,a.y-oy)-Math.hypot(b.x-ox,b.y-oy));
      for(const e of touched){
        p.hitIds.push(e.id);
        if(p.kind==='burn-shell'){
          this.effects.push({type:'burn-blast',x:e.x,y:e.y,size:85,recipeId:p.recipeId,carSlot:p.carSlot});
          for(const other of this.enemies)if(other.hp>0&&Math.hypot(other.x-e.x,other.y-e.y)<=85){this.ignite(other,p.burnDamage||4);this.hit(other,p.damage,p.element,ox,oy,p.recipeId,p.carSlot,p.source);}
        }else if(p.kind==='cannon'){
          this.effects.push({type:'cannon-impact',x:e.x,y:e.y,size:45,recipeId:p.recipeId,carSlot:p.carSlot});
          for(const other of this.enemies) if(other.hp>0&&Math.hypot(other.x-e.x,other.y-e.y)<=45) {
            if(p.corrosion) other.corrosion=p.corrosion;
            this.hit(other,p.damage*(other.id===e.id?1:.55),p.element,ox,oy,p.recipeId,p.carSlot,p.source);
            if(p.slow||p.freeze)this.chill(other,p.slow||0,p.freeze||0);
          }
        }else{
          const frozen=(e.freeze||0)>0;if(p.kind==='magnetic')e.armorBreak=3;if(p.corrosion)e.corrosion=p.corrosion;
          this.hit(e,p.damage*(frozen?(p.frozenBonus||(p.kind==='shatter'?2:1)):1),p.element,ox,oy,p.recipeId,p.carSlot,p.source);
          if(p.kind==='shatter')this.chill(e,2,1.3);if(p.slow||p.freeze)this.chill(e,p.slow||0,p.freeze||0);if(p.knockback)this.push(e,ox,oy,p.knockback);
        }
        if(p.recipeId==='cannon-fan' && p.kind==='pierce') {
          this.effects.push({type:'pierce-hit',x:e.x,y:e.y,dx:p.dx,dy:p.dy,size:p.hitIds.length,recipeId:p.recipeId,carSlot:p.carSlot,source:String(p.id)});
          if(p.hitIds.length>=2)this.events.push({type:'pierce_chain',time:this.time,value:`${p.id}:${p.hitIds.length}`});
        }
        if(p.kind!=='pierce'){p.life=0;break;}
      }
    }
    this.projectiles=this.projectiles.filter(p=>p.life>0);
  }
  private moveVortices(dt:number) {
    for(const v of this.vortices){v.life-=dt;v.age+=dt;v.x+=v.dx*dt;v.y+=v.dy*dt;v.tick-=dt;}
    this.vortices=this.vortices.filter(v=>v.life>0);
    for(const e of this.enemies){
      if(e.hp<=0||e.kind===3)continue;let nearest:Vortex|undefined,distance=Infinity;
      for(const v of this.vortices){const d=Math.hypot(v.x-e.x,v.y-e.y);if(d<v.radius+48&&d<distance){nearest=v;distance=d;}}
      if(!nearest||distance<.001)continue;const nx=(nearest.x-e.x)/distance,ny=(nearest.y-e.y)/distance,strength=1-distance/(nearest.radius+48);
      const inward=Math.min(distance*6,95+145*strength),tangent=(20+38*strength)*(nearest.id%2?-1:1);
      const vx=nx*inward-ny*tangent,vy=ny*inward+nx*tangent,cap=Math.min(1,190/Math.hypot(vx,vy));e.x+=vx*cap*dt;e.y+=vy*cap*dt;
    }
    for(const v of this.vortices)if(v.tick<=0){v.tick+=.15;for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x-v.x,e.y-v.y)<=v.radius+(e.kind===3?48:12))this.hit(e,v.damage,v.element,v.x-v.dx*.1,v.y-v.dy*.1,v.recipeId,v.carSlot);}
  }
  private finish(phase:'win'|'lose',reason:string) {this.phase=phase;this.endReason=reason;this.events.push({type:'run_end',value:phase,time:this.time});}
}
