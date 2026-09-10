# 列车整备视觉与双侧供弹

本轮方向：以余晖铁路的铜、墨紫、象牙白建立统一界面语法；让车序改变弹药行为，而不只增加面板百分比。保留当前工作区已有系统。

## 参考与取舍

- [Persona 5 UI 制作访谈](https://personacentral.com/persona-5-panel-concept-development-ui/)：参考主色、视线引导和优先信息的明暗层级。落实为铜色切角、主次按钮、暂停时可见的实际编队；不移植其红黑美术。
- [十三机兵防卫圈官方介绍](https://atlus.com/13sentinels/lang/en/)：参考武器配置与俯视战场之间的清楚对应。这里保留手绘场景，让武器和底座各司其职。
- [Monster Train 官方说明](https://www.themonstertrain.com/)：参考位置决策本身产生战术价值。本作采用两侧支援向中央攻击车供弹，不移植其分层防守规则。

## 已实现

- 破晓、鸣雷、守望各自对应铜金、紫钢、青瓷底座；同一车钩、轮距与安装座结构，按图像比例绘制。车头保持原始比例，后端与首节车厢对接。车厢在武器下方绘制。
- 钢轨、枕木、扣件、接头分层绘制，与地面使用同一行进速度；暂停冻结，低动态模式停止轨道位移。
- 暂停页显示实际车序、装甲、波次、时间、联动与下一构筑目标；继续为主按钮，调整/重开为次按钮。通用面板与按钮同步调整。
- 数字采用 imagegen v7 真透明图集；五类分别使用象牙、金、桃、青、珊瑚色。每字独立裁框，保留窄 1 和标点、统一基线，降低常规与持续跳字尺寸。
- 中央火炮/轨道炮拥有两个相邻支援车时，联动弹继承另一侧的冻结/腐蚀效果。发射时固定效果；既有较强状态不被弱效果覆盖；不新增伤害倍率。装配预览与选中车厢说明显示实际供弹结果。

## 新资产来源

- `assets/resources/art/afterglow-chassis-v1.png`：内置 imagegen 生成并两次修订，原始像素复制。第一版假透明被弃用；最终是纯洋红底图，以 `afterglow-chassis-key.effect` 在运行时去除背景。三张实际边界已测量，切片包含完整车钩。
- 最终提示：Production edit: redesign these three carriages into SHORT COMPACT NEAR-SQUARE WEAPON FLATBEDS. Keep copper/violet/celadon materials and ink detailed art style, pure #FF00FF magenta background. TWO pairs of wheels, empty round octagonal mount, short center couplers at both ends, overhead view, no text/shadows/gradients. 1536x1024 atlas.
- 初始提示要求三车头同材质底座、空武器座、俯视、两端车钩、透明背景；随后用生图移除假棋盘背景，再用上述提示缩短车体。
- 数字完整提示、来源与切片说明见 `tools/damage-digits-v7.provenance.json`。

## 验证与边界

战斗、构筑、装配预览、暂停面板、跳字、车站、开局相关测试通过。TypeScript 与 Cocos web 构建通过。

`tools/check-formation-art.mjs` 在 430×932 浏览器窗口检查了三套底座实际材质/比例、双侧供弹说明、暂停计时冻结、进入工坊、五种跳字以及自然开局。`artifacts/formation-redesign/receipt.json` 无运行时/资源错误。已人工查看编队、暂停、工坊、跳字和自然开局截图。首次运行发现菜单无出发配置时空值访问，以及轨道越出界面范围，已修复并重新构建通过。用于五种数字的截图是受控展示，`live-opening.png` 是实际自动战斗开局；不把前者当作自然出牌/平衡证据。

这是当前核心界面、列车与一种可组合战斗机制的落地，不代表全游戏美术终审或长期平衡验证。现有 Sites project 查询返回 project_not_found，本轮不创建替代项目、不覆盖远端。
