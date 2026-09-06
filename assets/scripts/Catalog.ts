export type CarType = 'cannon' | 'flame' | 'fan' | 'tesla' | 'cryo' | 'rail' | 'prism' | 'acid' | 'repair' | 'shield';
export type CarRole = 'offense' | 'buff' | 'debuff';
export const ROLE_NAMES: Record<CarRole, string> = { offense: '进攻', buff: '增益', debuff: '减益' };
export const CAR_TYPES: CarType[] = ['cannon', 'flame', 'fan', 'tesla', 'cryo', 'rail', 'prism', 'acid', 'repair', 'shield'];
export const CARS: Record<CarType, { name: string; description: string; color: string; role: CarRole }> = {
  cannon: { name: '火炮车', description: '发射缓速重型爆炸炮弹；命中后波及半径45内敌人。', color: '#FFC571', role: 'offense' },
  flame: { name: '喷火车', description: '持续喷射扇形火焰；相邻辅助车可强化喷火。', color: '#FF814E', role: 'offense' },
  fan: { name: '风扇车', description: '独立推开普通敌人，并为两侧相邻攻击车输送气流。', color: '#85E1CA', role: 'buff' },
  tesla: { name: '电弧车', description: '自动电击最近的三个目标；相邻辅助车可强化电弧。', color: '#C2AAFF', role: 'offense' },
  cryo: { name: '冰霜车', description: '独立造成低额冰伤并减速普通敌人，为相邻攻击车附加冰霜效果。', color: '#83D8FF', role: 'debuff' },
  rail: { name: '轨道炮车', description: '射出整束磁轨光束，瞬间贯穿直线上的敌群。', color: '#D6B99D', role: 'offense' },
  prism: { name: '棱镜车', description: '零伤害折光脉冲，为相邻进攻车分裂攻击。', color: '#EDB6ED', role: 'buff' },
  acid: { name: '蚀酸车', description: '低额酸伤并腐蚀敌人，削弱护盾与元素抗性。', color: '#B6D879', role: 'debuff' },
  repair: { name: '维修车', description: '每8秒修复3点装甲；相邻武器发动回收攻击，额外修复装甲。', color: '#CFD5B4', role: 'buff' },
  shield: { name: '护盾车', description: '每10秒补充12点护盾；相邻武器发动防卫攻击，额外充盾。', color: '#ACCEDC', role: 'buff' },
};
export type ModId = 'caliber' | 'fuel' | 'pressure' | 'voltage' | 'coolant' | 'resonance' | 'railpower' | 'prismfocus' | 'acidpotency' | 'rapid' | 'reach' | 'surge' | 'lanes' | 'scatter' | 'burst' | 'repairkit' | 'capacitor';
export const MODS: Record<ModId, { name: string; description: string; target: CarType | 'links'; mode?: 'cadence' | 'reach' | 'lanes' | 'burst' }> = {
  caliber: { name: '扩膛弹药', description: '现有火炮车升1级：炮弹伤害和火炮联动增强。', target: 'cannon' },
  fuel: { name: '高热燃料', description: '现有喷火车升1级：喷火与火系联动伤害提升。', target: 'flame' },
  pressure: { name: '增压叶轮', description: '现有风扇车升1级：风压与气流联动增强。', target: 'fan' },
  voltage: { name: '高压线圈', description: '现有电弧车升1级：电伤和电系联动增强。', target: 'tesla' },
  coolant: { name: '低温冷剂', description: '现有冰霜车升1级：冰伤和冰系联动增强。', target: 'cryo' },
  resonance: { name: '同步传动', description: '所有相邻联动升1级：联动伤害提升。', target: 'links' },
  railpower: { name: '磁轨增压', description: '现有轨道炮升1级：轨道弹与联动伤害提升。', target: 'rail' },
  prismfocus: { name: '精磨晶面', description: '现有棱镜升1级：相邻折射联动伤害提升。', target: 'prism' },
  acidpotency: { name: '浓缩蚀剂', description: '现有蚀酸车升1级：酸伤与腐蚀联动增强。', target: 'acid' },
  rapid: { name: '自动供弹', description: '现有火炮攻击间隔每级缩短20%。', target: 'cannon', mode: 'cadence' },
  reach: { name: '延伸喷管', description: '现有喷火车及火流联动射程每级增加25%。', target: 'flame', mode: 'reach' },
  surge: { name: '快速放电', description: '现有电弧车攻击间隔每级缩短20%。', target: 'tesla', mode: 'cadence' },
  lanes: { name: '并列磁轨', description: '轨道炮每级增加一束平行光束，每束伤害和宽度降低。', target: 'rail', mode: 'lanes' },
  scatter: { name: '霰射弹仓', description: '现有火炮每级增加一发偏转炮弹，单发伤害和弹体缩小。', target: 'cannon', mode: 'burst' },
  burst: { name: '序列连发', description: '火炮每级追加一发延时连射，单发伤害降低；锁定本次瞄准方向。', target: 'cannon', mode: 'burst' },
  repairkit: { name: '精密修复组', description: '现有维修车升1级：每次多修复1点，回收联动增强。', target: 'repair' },
  capacitor: { name: '储能电容', description: '现有护盾车升1级：每次充盾增加4点，护盾上限增加4点。', target: 'shield' },
};
export interface Recipe { id: string; name: string; description: string; hint: string; a: CarType; b: CarType; directional: false; executor: CarType; }
export const RECIPES: Recipe[] = [
  { id: 'cannon-fan', name: '风压贯穿炮', description: '风扇输送气流，火炮发射贯穿敌群的高速炮弹。', hint: '用气流强化火炮。', a: 'cannon', b: 'fan', directional: false, executor: 'cannon' },
  { id: 'cannon-cryo', name: '冻结碎裂炮', description: '冰霜附加冻结，火炮重击已冻结目标。', hint: '让炮弹带上低温。', a: 'cannon', b: 'cryo', directional: false, executor: 'cannon' },
  { id: 'flame-fan', name: '聚焦火流', description: '风扇聚拢火焰，由喷火车射出更远、更窄的高热火束。', hint: '用气流集中喷火。', a: 'flame', b: 'fan', directional: false, executor: 'flame' },
  { id: 'flame-cryo', name: '冷热爆破', description: '喷火车引爆目标区域；减速或冻结敌人承受双倍温差伤害。', hint: '用低温配合高热攻击。', a: 'flame', b: 'cryo', directional: false, executor: 'flame' },
  { id: 'fan-tesla', name: '聚怪电涡', description: '风扇强化电弧车，在目标处形成吸附并持续电击的气旋。', hint: '用气旋留住电流。', a: 'fan', b: 'tesla', directional: false, executor: 'tesla' },
  { id: 'tesla-cryo', name: '冻结传导', description: '冰霜强化电弧车，电流冻结首个目标并传给附近敌人。', hint: '让电流沿着冰霜传导。', a: 'tesla', b: 'cryo', directional: false, executor: 'tesla' },
  { id: 'rail-fan', name: '风压磁轨', description: '气流强化轨道弹，贯穿并击退普通敌人。', hint: '让气流辅助轨道炮。', a: 'rail', b: 'fan', directional: false, executor: 'rail' },
  { id: 'rail-cryo', name: '冰封磁轨', description: '轨道弹贯穿冻结敌群，对已冻结目标加伤。', hint: '让冰霜辅助轨道炮。', a: 'rail', b: 'cryo', directional: false, executor: 'rail' },
  { id: 'cannon-prism', name: '折射弹幕', description: '火炮同时发射三道平行炮弹。', hint: '让棱镜辅助火炮。', a: 'cannon', b: 'prism', directional: false, executor: 'cannon' },
  { id: 'flame-prism', name: '三重火扇', description: '喷火车分出三束窄火流并点燃目标。', hint: '让棱镜辅助喷火。', a: 'flame', b: 'prism', directional: false, executor: 'flame' },
  { id: 'tesla-prism', name: '分光电网', description: '电流分裂，最多打击六个目标。', hint: '让棱镜辅助电弧。', a: 'tesla', b: 'prism', directional: false, executor: 'tesla' },
  { id: 'rail-prism', name: '棱光磁轨', description: '轨道炮发射三道平行贯穿弹。', hint: '让棱镜辅助轨道炮。', a: 'rail', b: 'prism', directional: false, executor: 'rail' },
  { id: 'cannon-acid', name: '蚀甲炮弹', description: '炮弹先腐蚀再命中，削弱护盾与抗性。', hint: '让蚀酸辅助火炮。', a: 'cannon', b: 'acid', directional: false, executor: 'cannon' },
  { id: 'flame-acid', name: '腐燃火流', description: '火焰腐蚀并点燃敌群，持续压制再生。', hint: '让蚀酸辅助喷火。', a: 'flame', b: 'acid', directional: false, executor: 'flame' },
  { id: 'tesla-acid', name: '腐蚀传导', description: '腐蚀电流连击附近敌人，已腐蚀目标承受额外伤害。', hint: '让蚀酸辅助电弧。', a: 'tesla', b: 'acid', directional: false, executor: 'tesla' },
  { id: 'rail-acid', name: '溶蚀磁轨', description: '贯穿弹沿途腐蚀敌人，并造成酸性伤害。', hint: '让蚀酸辅助轨道炮。', a: 'rail', b: 'acid', directional: false, executor: 'rail' },
];
for(const offense of ['cannon','flame','tesla','rail'] as CarType[]){
  const names={cannon:'回收炮弹',flame:'余热回收',tesla:'电能回流',rail:'磁轨回收'};
  RECIPES.push({id:`${offense}-repair`,name:names[offense as keyof typeof names],description:'武器追加一次回收攻击，同时修复2点装甲；每4秒发动。',hint:'让武器与维修车相邻。',a:offense,b:'repair',directional:false,executor:offense});
  RECIPES.push({id:`${offense}-shield`,name:`防卫${offense==='cannon'?'炮击':offense==='flame'?'火流':offense==='tesla'?'电弧':'磁轨'}`,description:'武器追加一次防卫攻击，同时补充4点护盾；每4.5秒发动。',hint:'让武器与护盾车相邻。',a:offense,b:'shield',directional:false,executor:offense});
}
export function getRecipe(a: CarType, b: CarType): Recipe | null {
  if (a === b || (CARS[a].role === 'offense') === (CARS[b].role === 'offense')) return null;
  return RECIPES.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a)) || null;
}
