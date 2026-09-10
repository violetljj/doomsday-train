export type WorldId = 'city' | 'foundry' | 'frost' | 'flood' | 'garden' | 'citadel' | 'salt' | 'dunes' | 'viaduct' | 'ash' | 'aurora' | 'skyport';
export type WorldWeather = 'rain' | 'embers' | 'snow' | 'mist' | 'spores';
export interface WorldDefinition { id: WorldId; name: string; subtitle: string; art: string; color: string; weather: WorldWeather; enemyHint: string; }
export interface WorldState extends WorldDefinition { index: number; cycle: number; progress: number; remaining: number; }
export const WORLD_DURATION = 60;
export const WORLD_IDS: readonly WorldId[] = ['city', 'foundry', 'frost', 'flood', 'garden', 'citadel', 'salt', 'dunes', 'viaduct', 'ash', 'aurora', 'skyport'];
export const WORLDS: Record<WorldId, WorldDefinition> = {
  city: {id:'city',name:'雨巷废城',subtitle:'穿过积水街道，驶离最后的灯火',art:'afterglow-city-v2',color:'#7BB5B6',weather:'rain',enemyHint:'普通敌人与疾行者较多，留意贴近车身的快敌。'},
  foundry: {id:'foundry',name:'铜锈货场',subtitle:'货轨尽头，熔炉仍在呼吸',art:'afterglow-foundry-v2',color:'#D39866',weather:'embers',enemyHint:'重甲与分裂敌人增多，贯穿和范围攻击更有用。'},
  frost: {id:'frost',name:'白霜电站',subtitle:'冰封线缆之间，电光尚未熄灭',art:'afterglow-frost-v2',color:'#A5CDE8',weather:'snow',enemyHint:'绝缘与护盾敌人增多，避免只依赖电伤。'},
  flood: {id:'flood',name:'深潮水库',subtitle:'闸门沉入雾中，沿堤岸继续前行',art:'afterglow-flood-v2',color:'#74AFC0',weather:'mist',enemyHint:'护盾掩护疾行者，控制快敌并集中破盾。'},
  garden: {id:'garden',name:'孢雾花园',subtitle:'藤蔓吞没旧城，孢子追逐余温',art:'afterglow-garden-v2',color:'#ADB979',weather:'spores',enemyHint:'再生与分裂敌人增多，灼烧能阻止再生。'},
  citadel: {id:'citadel',name:'余烬要塞',subtitle:'越过焦土防线，驶向更远的荒原',art:'afterglow-citadel-v2',color:'#C98275',weather:'embers',enemyHint:'重甲与耐火敌人增多，腐蚀或混合伤害更可靠。'},
  salt: {id:'salt',name:'镜盐荒原',subtitle:'盐晶映着余光，旧路在倒影中延伸',art:'afterglow-salt-v1',color:'#BAC3C1',weather:'mist',enemyHint:'护盾与绝缘敌人交错推进，腐蚀破盾后换用物理或火伤。'},
  dunes: {id:'dunes',name:'风蚀沙海',subtitle:'风抹去了足迹，却未能掩埋方向',art:'afterglow-dunes-v1',color:'#C4A67E',weather:'mist',enemyHint:'疾行者与重甲混编，减速快敌并用元素伤害处理重甲。'},
  viaduct: {id:'viaduct',name:'断桥高架',subtitle:'沿断裂的高架，跨过雨中的废墟',art:'afterglow-viaduct-v1',color:'#8A9CAA',weather:'rain',enemyHint:'分裂敌人夹杂疾行者，范围攻击与持续控制能缓解包围。'},
  ash: {id:'ash',name:'陨坑灰原',subtitle:'烧痕铺满大地，灰烬仍留着微温',art:'afterglow-ash-v1',color:'#B18E85',weather:'embers',enemyHint:'耐火与重甲掩护再生敌人，混合伤害和针对性灼烧更可靠。'},
  aurora: {id:'aurora',name:'极光冻湖',subtitle:'冰下暗流未停，极光照亮长夜',art:'afterglow-aurora-v1',color:'#91C7C7',weather:'snow',enemyHint:'绝缘与护盾敌人增多，少量再生敌人需要及时点燃。'},
  skyport: {id:'skyport',name:'失落天港',subtitle:'旧航道的尽头，新的环线在云下展开',art:'afterglow-skyport-v1',color:'#A7A0C4',weather:'mist',enemyHint:'疾行、护盾与分裂敌人轮番压近，保持多种伤害与控制覆盖。'},
};

/** Region indices and cycles are zero-based; difficulty remains Combat's elapsed-time curve. */
export function evaluateWorld(time: number): WorldState {
  const elapsed=Number.isFinite(time)?Math.max(0,time):0;
  const ordinal=Math.floor((elapsed+1e-8)/WORLD_DURATION);
  const index=ordinal%WORLD_IDS.length,within=Math.max(0,elapsed-ordinal*WORLD_DURATION);
  return {...WORLDS[WORLD_IDS[index]],index,cycle:Math.floor(ordinal/WORLD_IDS.length),progress:Math.min(1,within/WORLD_DURATION),remaining:Math.max(0,WORLD_DURATION-within)};
}

/** Kind 3 is a separately scheduled boss. Weights change encounters, never enemy stats. */
export const WORLD_ENEMY_WEIGHTS: Record<WorldId, readonly (readonly [number, number])[]> = {
  city: [[0,.55],[1,.30],[2,.10],[6,.05]],
  foundry: [[0,.35],[1,.10],[2,.30],[7,.20],[4,.05]],
  frost: [[0,.35],[1,.10],[5,.30],[6,.20],[2,.05]],
  flood: [[0,.40],[1,.25],[6,.25],[5,.10]],
  garden: [[0,.35],[1,.10],[8,.30],[7,.20],[4,.05]],
  citadel: [[0,.30],[1,.10],[2,.25],[4,.25],[6,.10]],
  salt: [[0,.35],[1,.15],[6,.25],[5,.15],[2,.10]],
  dunes: [[0,.40],[1,.30],[2,.20],[8,.10]],
  viaduct: [[0,.40],[1,.25],[7,.20],[6,.15]],
  ash: [[0,.40],[4,.25],[2,.20],[8,.15]],
  aurora: [[0,.35],[1,.10],[5,.25],[6,.20],[8,.10]],
  skyport: [[0,.30],[1,.20],[6,.20],[7,.15],[2,.10],[8,.05]],
};
export function selectWorldEnemy(time: number, roll: number): number {
  const world=evaluateWorld(time),value=Number.isFinite(roll)?Math.max(0,Math.min(1-Number.EPSILON,roll)):0;
  let sum=0,kind=0;
  for(const [candidate,weight] of WORLD_ENEMY_WEIGHTS[world.id]){sum+=weight;if(value<sum){kind=candidate;break;}}
  const introducedAt: Record<number,number>={0:0,1:12,2:18,4:30,5:38,6:44,7:50,8:60};
  return time>=introducedAt[kind]?kind:0;
}
