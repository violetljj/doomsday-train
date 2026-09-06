export type CarType = 'cannon' | 'flame' | 'fan' | 'tesla' | 'cryo';
export const CAR_TYPES: CarType[] = ['cannon', 'flame', 'fan', 'tesla', 'cryo'];
export const CARS: Record<CarType, { name: string; description: string; color: string }> = {
  cannon: { name: '火炮车', description: '发射实体炮弹；重甲会削弱物理伤害。', color: '#FFC571' },
  flame: { name: '喷火车', description: '持续灼烧前方扇形区域；耐火敌人更难烧穿。', color: '#FF814E' },
  fan: { name: '风扇车', description: '零伤害风压推开普通敌人，为相邻车提供气流。', color: '#85E1CA' },
  tesla: { name: '电弧车', description: '自动电击最近的三个目标；绝缘敌人抵抗电伤。', color: '#C2AAFF' },
  cryo: { name: '冰霜车', description: '释放冰霜波，伤害并减速普通敌人。', color: '#83D8FF' },
};
export type ModId = 'caliber' | 'fuel' | 'pressure' | 'voltage' | 'coolant' | 'resonance';
export const MODS: Record<ModId, { name: string; description: string; target: CarType | 'links' }> = {
  caliber: { name: '扩膛弹药', description: '现有火炮车升1级：炮弹伤害和爆破强度提升。', target: 'cannon' },
  fuel: { name: '高热燃料', description: '现有喷火车升1级：火焰与燃烧伤害提升。', target: 'flame' },
  pressure: { name: '增压叶轮', description: '现有风扇车升1级：风压与气流联动增强。', target: 'fan' },
  voltage: { name: '高压线圈', description: '现有电弧车升1级：电伤和电系联动增强。', target: 'tesla' },
  coolant: { name: '低温冷剂', description: '现有冰霜车升1级：冰伤和冰系联动增强。', target: 'cryo' },
  resonance: { name: '同步传动', description: '所有相邻联动升1级：联动伤害提升。', target: 'links' },
};
export interface Recipe { id: string; name: string; description: string; hint: string; a: CarType; b: CarType; directional: boolean; }
export const RECIPES: Recipe[] = [
  { id: 'cannon-flame', name: '燃烧爆弹', description: '爆弹命中后灼烧周围敌人。', hint: '炮弹能否带走火种？', a: 'cannon', b: 'flame', directional: false },
  { id: 'cannon-fan', name: '风压贯穿炮', description: '高速炮弹贯穿整条弹道上的敌人。', hint: '气流能让炮弹走得更远。', a: 'cannon', b: 'fan', directional: false },
  { id: 'cannon-tesla', name: '破甲磁弹', description: '电磁炮弹破坏重甲，短暂解除物理抗性。', hint: '让钢铁带上电荷。', a: 'cannon', b: 'tesla', directional: false },
  { id: 'cannon-cryo', name: '冻结碎裂炮', description: '冰弹冻结普通敌人，重击已冻结目标。', hint: '低温会让外壳变脆。', a: 'cannon', b: 'cryo', directional: false },
  { id: 'flame-fan', name: '火焰龙卷', description: '前车喷火、后车送风，生成吸附并灼烧敌人的移动龙卷。', hint: '先有火，再接风，会发生什么？', a: 'flame', b: 'fan', directional: true },
  { id: 'fan-flame', name: '聚焦火流', description: '前车送风、后车喷火，形成射程更远的狭窄高热火束。', hint: '调换风与火的前后顺序。', a: 'fan', b: 'flame', directional: true },
  { id: 'flame-tesla', name: '点燃跳电', description: '电弧跳过多个目标并留下持续燃烧。', hint: '电弧也能成为引火线。', a: 'flame', b: 'tesla', directional: false },
  { id: 'flame-cryo', name: '冷热爆破', description: '温差冲击炸开一片区域；对减速或冻结目标伤害翻倍。', hint: '骤热与骤冷在同一处相遇。', a: 'flame', b: 'cryo', directional: false },
  { id: 'fan-tesla', name: '聚怪电涡', description: '在目标处形成固定电涡，吸附并持续电击敌人。', hint: '让电流在气旋中停留。', a: 'fan', b: 'tesla', directional: false },
  { id: 'fan-cryo', name: '暴风雪', description: '大范围冰霜脉冲，长时间减速普通敌人。', hint: '冷风需要更大的舞台。', a: 'fan', b: 'cryo', directional: false },
  { id: 'tesla-cryo', name: '冻结传导', description: '电流冻住首个目标，并传给附近敌人；已受冷目标额外受伤。', hint: '沿着冰霜寻找下一条电路。', a: 'tesla', b: 'cryo', directional: false },
];
export function getRecipe(a: CarType, b: CarType): Recipe | null {
  if (a === b) return null;
  return RECIPES.find(r => (r.a === a && r.b === b) || (!r.directional && r.a === b && r.b === a)) || null;
}
