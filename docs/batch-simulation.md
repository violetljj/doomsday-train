# 批量无画面模拟

无需启动 Cocos、浏览器或安装新依赖。使用 Node.js 22.18+（本机验证 24.16）。直接调用游戏的 Combat.ts，每步仍为真实 1/30 秒；加速来自不渲染、不等待现实时间，不修改伤害、敌人或随机规则。

```powershell
node --experimental-strip-types tools/simulate.mjs
node --experimental-strip-types tools/simulate.mjs --runs 1000 --seed 1 --seconds 180 --policy random
node --experimental-strip-types tools/simulate.mjs --runs 1 --seed 137 --seconds 180 --policy balanced
node --experimental-strip-types tests/simulation.test.mjs
```

默认 1000 局、连续种子 1–1000、每局最多 180 游戏秒、balanced 策略。使用 --out 指定输出目录；默认创建时间戳目录。每 100 局打印进度。自定义目录中的同名报告会被覆盖。

- balanced：装甲不高于50优先维修；空位优先装车，并优先与末节形成攻辅邻接；满编优先合并重复车，其次升级；不替换已有车。分数相同时选靠前的卡。这是透明的简单启发式，并非最优策略。
- random：均匀随机选补给；有空位直接安装，满编同类合并，否则随机替换。决策使用独立随机流，不消耗游戏随机流。
- 两种策略均自动处理补给和工坊，只通过公开操作接口，不读取未来事件。

输出 summary.json（汇总、参数、耗时、Node版本、规则与模拟脚本SHA-256）、runs.csv（每局基础指标）、runs.json（另含构筑、配方、完整选卡记录）。用报告里的种子、策略和时限可复现某局，前提是规则和脚本哈希相同。保留报告对应源码版本；哈希用于核对，不包含源码快照。

当前游戏为无尽模式：horizon 是活到测试时限，lose 是死亡；不要把 horizon 写成通关。seconds 均值是受时限截断的观测时长，不是无限期平均寿命。记录波次、击杀、废料、装甲、补给、Boss击杀和死亡原因；当前规则仅报告 armor，无法从这个字段区分普通敌人与Boss的致命伤害。运行异常立即报错，不冒充死亡或存活。时限向上取整到30Hz模拟帧。

比较改动时，保持种子范围、策略、时限一致，使用不同输出目录。每种策略分别运行1000局可对照；统计反映自动策略与当前种子样本，不等于真人胜率、画面流畅度或设备性能。界面与真实操作仍按 validation-workflow.md 做少量抽查。
