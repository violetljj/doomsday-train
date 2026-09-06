# 已选方向：3 · 余晖防线

用户已明确选定方案3「余晖防线」，以 [C2-afterglow-details.png](C2-afterglow-details.png) 为本轮实现基底。初版 [C-afterglow-defense.png](C-afterglow-defense.png) 为同方向探索；其他方向及其细化图保留为历史备选。

## 视觉约束

- 明显手绘的墨线轮廓、平涂与宽笔触，保持旧机械列车和萧瑟空城的质感。
- 暮色以紫靛阴影、灰紫路面及少量灰粉、暖桃余光组织，战场地表低对比，优先看清车厢和攻击。
- 战术投影轻盈、适量，服务于辅助传能、职责和攻击反馈；避免厚重金框、大块高亮面板占据画面。
- 菜单为纵向叙事插画，预留标题和按钮空间；战斗采用正俯视地表与动态铁轨。

## 当前资产与接入

| 资源 | 用途 |
| --- | --- |
| [afterglow-menu.png](../../assets/resources/art/afterglow-menu.png) | 主菜单暮色空城、高架铁路和小列车插画。 |
| [afterglow-ground.png](../../assets/resources/art/afterglow-ground.png) | 正俯视灰紫破裂路面，中央留出清晰通道；轨道由引擎动态绘制。 |
| [afterglow-units.png](../../assets/resources/art/afterglow-units.png) | 车体、五类武器模块、敌人与机车图集；战场、补给和工坊卡面共用单位素材。 |
| [afterglow-fx.png](../../assets/resources/art/afterglow-fx.png) | 手绘攻击特效图集，结合旋转、缩放、淡出和动态线条形成战斗反馈。 |

实战中车体与武器模块分离：炮火模块跟随平滑瞄准角旋转，风扇持续转动；特效从实际执行武器出发。菜单和地表的完整生成提示词与来源分别见 [菜单记录](afterglow-menu-prompt.md)、[地表记录](afterglow-ground-prompt.md)。

## 机制与验证边界

概念图确定风格，不替代规则。当前仍是五个功能槽、进攻/增益/减益三类职责、六种无方向差异的相邻联动；风扇独立零伤害、冰霜独立低伤害，进攻车执行联动。详细规则见 [0.4机制](../mechanics-0.4.md)。

本页记录已选方向和资产接入状态，不代表本轮QA通过。当前是Web原型，尚未执行抖音开发者工具及抖音真机验证；实际验证结果以[验证记录](../test-record.md)为准。
