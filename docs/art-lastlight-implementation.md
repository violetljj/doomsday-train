# 最后的日光：可玩主题实现

用户选定 `docs/art-directions/last-light-battle-concept-v1.png`，要求复刻主题。本轮把主题落到现有 Cocos 游戏，没有把整张概念稿作为交互替代。

## 资产与使用

- `assets/resources/art/lastlight-city-v1.png`：冷青积水旧城、象牙白残墙、朱砂落日，独立场景；没有烘焙列车、敌人、轨道或 UI。生成记录在 `docs/art-lastlight-city-v1.md`。
- `assets/resources/art/lastlight-train-v1.png`：三种日光车头、标准象牙朱砂底座、十种独立武器模块、信号灯和日轮纹章。片段矩形和原始生成提示在 `tools/lastlight-train-v1.provenance.json`。
- `assets/resources/art/lastlight-enemies-v1.png`：九种真实透明墨影敌人；立姿、伞形、票据脸与纸片衣摆。坐标与提示在 `tools/lastlight-enemies-v1.provenance.json`。
- `assets/resources/art/lastlight-ui-v1.png`：标题字标、车票底栏、整备面板、朱砂按钮。

列车与 UI 生图最初含假棋盘背景，均通过内置 imagegen 背景替换为洋红，再用运行时色键材质透明合成。材质只消除洋红溢色，保留朱砂红。没有用图像处理脚本重画素材。

UI 最终原图：`C:/Users/26442/.codex/generated_images/01a089f8-6c16-75e0-87af-6f51fb6a5d02/exec-c9bced0e-008d-4a1d-9567-48f3e43ae423.png`，1536×1024，原像素复制保存。使用内置 imagegen。首轮提示：2×2 production UI sprite sheet matching THE LAST LIGHT reference; weathered ivory paper, dark petroleum green, gold ink, vermilion diagonal signal corners; title 末日列车 / THE LAST LIGHT, blank ticket footer, blank dispatch panel, blank action button; safe margins, no characters or scenery. 第二轮提示：Preserve exactly all four UI assets, title lettering, typography, textures, geometry, outlines and positions. Replace ALL fake checkerboard outside every asset and between title glyphs with uniform solid chroma-key magenta #FF00FF. No checkerboard, creases, gradients or external shadows; same 1536×1024 dimensions. 完整调用保留在本任务 imagegen 记录。

## 实际行为

战斗、菜单、暂停、工坊、补给、车库、图鉴与结算沿用既有操作流程，统一墨青/象牙/朱砂色。主操作使用独立票据按钮，战斗 HUD 把时间和装甲集中在左侧，下方显示当前五节模块和真实联动数量。数字仍使用 v7 独立字形。

列车保持单独车头/底座/武器绘制，武器保留原始比例与炮座旋转中心；折扇缓慢摆动，停止旧涡轮式整圈旋转。敌人保持立姿，墨色碎片和退场淡出响应真实击杀。车钩光点根据真实相邻联动出现；未接通的车厢不伪装成联动。场景地平线固定，枕木和水纹提供运动，静态模式与暂停保留对应限制。

本轮未修改伤害公式与成长平衡。现有区域切换/天气规则数据保留，但背景统一使用这张水巷主题图，并非制作了十二张新区域背景。地图与敌人保持游戏所需的可读空间；概念图中的临时数值、文本与数量不作为真实游戏状态硬编码。

## 验证

`tools/check-lastlight.mjs` 检查自然开局、五节编组、真实工坊入口、暂停冻结、主题资产完整加载以及两种屏幕比例。`artifacts/lastlight/` 保存运行截图与错误记录。五节截图为受控构图，不当作自然获得五节车厢或长期平衡证据。

最终视觉比较和运行检查结果见根目录 `design-qa.md`。字体包含本轮新增中文字，检查使用 `tools/build-modern-fonts.py --check`。本轮没有公开发布，也没有清理用户已有未提交工作。
