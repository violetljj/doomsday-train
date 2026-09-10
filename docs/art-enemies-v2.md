# 余晖敌群图集 v2

本轮用户要求升级全部旧敌人美术，并让新敌人拥有可辨识的独特外形。使用内置 image_gen 完成一次生成、一次布局修订；最终采用**首版真实 RGBA 图集**。第二版的棋盘格被烘焙进 RGB，已拒绝。未使用 CLI、图像去背脚本、缩放或算法绘图。

## 资产与来源

- 项目资产：`assets/resources/art/afterglow-enemies-v2.png`
- Cocos UUID：`38483cdb-7e4c-4e82-8277-58b6871d9687`，整图 spriteFrame 保持 no-trim、不可打包、hasAlpha=true。
- 首版原件：`C:/Users/26442/.codex/generated_images/01a08729-5f33-73c2-b7dd-2ee2411942a6/exec-ab2d2db5-7dd4-44dd-87aa-6a76d0264e8e.png`
- 拒绝的修订版：`C:/Users/26442/.codex/generated_images/01a08729-5f33-73c2-b7dd-2ee2411942a6/exec-43ef61b8-7e24-4668-a1c1-e9fad493051a.png`
- 已查看的风格依据：`docs/art-directions/C2-afterglow-details.png` 与 `assets/resources/art/afterglow-units.png`。生成时以文字描述提取其墨线、平涂、冷暖叠色特征，未将现有绿幕背景作为参考输入。

## 检验及接入边界

实际尺寸 **1254 × 1254**，并非请求的1536 × 1536。首版 RGBA 的 alpha 范围0–255，950949像素完全透明，约60.47%。九种主要连通轮廓完整且互不相连，没有景物、UI文字或地面投影。九种造型分别通过体形、肢体、甲壳、重臂、尖刺、铜线绝缘体、前盾、孵化囊、枝状触角区别。

请求的3×3等分布局大体存在，但没有实现每格20%留白；首领上臂与右侧部分越过名义418格线。**禁止直接按418×418均匀网格切片**，否则会污染相邻帧并切断首领肢体。以下为首版alpha>0主要连通体边界外扩2像素的完整帧。读取与统计使用 Pillow/NumPy/SciPy，仅作只读检测，项目PNG与首版原件字节一致。

姿态与“全部朝上”的请求存在差异，多数怪物的可识别头部朝下。运行时须按实际头部校正旋转方向；不得把提示词朝向当作已验证事实。当前报告证明源图轮廓可切片，不替代35–80px实际战斗可读性和旋转验收。

## 帧表

坐标采用图像左上角为原点，格式 `[x, y, width, height]`。所有矩形保留整个主要透明连通轮廓并带2像素余量。外围少量极低alpha散点不作为主体边界依据。

| kind | 造型 | 帧矩形 |
|---|---|---|
| 0 | 低伏四足拾荒兽 | [59, 79, 315, 279] |
| 1 | 长腿尖身疾行兽 | [501, 15, 249, 387] |
| 2 | 宽甲重装甲虫 | [862, 37, 366, 354] |
| 3 | 六足重臂熔芯首领 | [13, 409, 414, 429] |
| 4 | 炭甲尖刺耐火兽 | [465, 455, 327, 331] |
| 5 | 铜螺旋陶壳绝缘兽 | [865, 463, 359, 329] |
| 6 | 月牙前盾护盾兽 | [43, 893, 346, 317] |
| 7 | 三囊孵化分裂兽 | [445, 836, 365, 382] |
| 8 | 枝角绿芯再生兽 | [861, 834, 366, 390] |

```ts
const enemyFrames = [
  [59,79,315,279], [501,15,249,387], [862,37,366,354],
  [13,409,414,429], [465,455,327,331], [865,463,359,329],
  [43,893,346,317], [445,836,365,382], [861,834,366,390],
];
```

## 首版完整提示词

```text
Use case: stylized-concept.
Asset type: production enemy sprite atlas for the Chinese top-down mobile game Doomsday Train / Afterglow Defense.
Create ONE square 1536 x 1536 PNG sprite sheet with EXACTLY THREE columns and THREE rows, each cell exactly 512 x 512. Nine unique monsters in row-major order. Invisible grid, no grid lines. All nine sprites genuinely cut out on TRANSPARENT ALPHA ZERO background: empty corners, gutters, gaps between legs, and every area outside anatomy must contain real transparent pixels, NOT painted checkerboard, gray, black, white or greenscreen.

Art direction: dusk battlefield, hand-painted opaque gouache with deliberate near-black variable ink contours. Broad imperfect painted planes, cold indigo-violet structural shadows, dusty pale ceramic/metal highlights and restrained warm peach edge accents. Readable, strong, individually recognizable anatomy at 35–80 pixels. Mechanical nonhuman scavenger monsters. Painted materials rather than 3D-rendered gloss, no tiny noise texture. Black mechanical limbs balanced against broad colored plates and glowing core accents. Top-down orthographic view directly above, head/front pointing UP for every creature, no isometric or side view. Paint self-shadow only within the silhouette; NO cast shadow, ambient shadow, ground or surroundings.

Uniform exact cell centers at x=256,768,1280 and y=256,768,1280. Keep each whole sprite in its own cell with minimum 20% fully transparent margin on every side. The boss may fill slightly more of its cell while still leaving safe transparent gutters. No appendage or glow reaches another cell. All ordinary sprites about 280–310 pixels across their longest dimension; boss about 360. Exactly ONE creature per cell with all its limbs and parts attached.

ROW 1:
Cell (0,0), kind 0 SCAVENGER: low hunched compact four-legged crawler, rough squat angular body, hooked short limbs, rusty mauve back plates, single dull peach slit. Distinct low broad crablike silhouette.
Cell (1,0), kind 1 RUNNER: narrow pointed arrowhead central body, two very long thin angular rear legs and small forward graspers, swift asymmetric mechanical insect posture. Cool smoky purple carapace. Silhouette visibly much slimmer than the crawler.
Cell (2,0), kind 2 HEAVY: broad armored beetle, massive overlapping slate and dusty ivory plates, small inset head, six short thick legs, heavy flat shoulder shell. Deliberately sturdy blocky outline.

ROW 2:
Cell (0,1), kind 3 BOSS: huge radial six-legged siege beast, two upper/front limbs are unmistakable broad hammerlike siege arms; four other jointed legs spread to the sides and rear. Massive purple-black chassis, hot peach/orange central reactor core, broken plated armor. No horns that obscure the core. Most imposing distinctive silhouette.
Cell (1,1), kind 4 FIRE-RESISTANT: charcoal black scarab bristling with chunky triangular spikes, ember red armor plates, squat pointed hostile outline, compact mechanical limbs. Spikes are attached armor, not surrounding fire.
Cell (2,1), kind 5 INSULATED: smooth rounded pale ceramic shell with prominent brass/copper spiral-shaped insulators attached to its sides, four short insulated legs, restrained lavender shading. Rounded outline contrasts strongly with spiky fire creature.

ROW 3:
Cell (0,2), kind 6 SHIELD: armored crawler with an unmistakable broad crescent-shaped physical shield across its UP-facing front, blue-gray thick shield lip, visible compact cyan generator behind it, four mechanical legs. Crescent fore-shield is attached machinery, not a separate floating symbol or circle.
Cell (1,2), kind 7 SPLITTER: spindly spider carrying a clear cluster of exactly three large round mauve pods on its back, triangular three-pod arrangement, small front head above cluster, thin angular legs. Pods attached, no additional separate small monsters.
Cell (2,2), kind 8 REGENERATOR: compact biomechanical beast with branching antler-like antennae/tendrils rising toward the top sides, central pale moss-green core under broken riblike armor and slender attached limbs. Distinct organic branching silhouette, no foliage scene.

No letters, numbers, words, labels, logos, watermarks, UI, frames, arrows, separate icons, scenery, floor, color swatches, detached particles or cast shadows. No human characters, gore, blood or exposed organs. Anatomy, proportions and silhouettes—not recoloring—must distinguish all nine. Preserve a cohesive painterly twilight style. Deliver genuine transparent RGBA PNG suitable to overlay directly on an existing game battlefield.
```

## 布局修订完整提示词（未采用）

```text
Use case: precise-object-edit. This is a production atlas layout repair of the supplied nine-enemy sprite sheet. Preserve all nine existing hand-painted gouache/ink creature designs, colors, anatomy and row-major identity order EXACTLY. Change ONLY their scale/placement to create safe separated equal grid cells. Do not add scenery or change the visual style.

Output one square PNG, preferably 1536x1536, with precisely THREE EQUAL COLUMNS and THREE EQUAL ROWS. Each enemy must be centered in its own equal square cell. ALL nine creatures must be made substantially smaller within their cells: scale the existing artwork to occupy at most60% of its cell width AND height, leaving at least20% empty transparent margin on EVERY side. Boss can occupy at most70% with15% margin. Entire long runner legs, hammer arms, pod spider legs and branching antlers must fit. No pixel from a neighboring sprite may appear in another cell. In particular shrink/recenter the boss so its upper hammer arms do not touch the scavenger cell, and shrink the runner, armored beetle and regeneration antlers. Do not crop or cut appendages.

CRITICAL: Preserve the existing REAL TRANSPARENT RGBA ALPHA CHANNEL. Every empty background pixel must have alpha=0; preserve opaque artwork and antialiased edges. Output actual alpha, NOT a rendered checkerboard, black backdrop, white backdrop, gray, greenscreen, or transparency preview pattern. Clean detached pixel specks in empty gutters. No cast shadows.

ROW1 scavenger / slim runner / armored beetle.
ROW2 hammer-limbed reactor boss / fire spiked red beast / rounded ceramic copper-insulated creature.
ROW3 broad crescent shield beast / three-pod splitter spider / green-core antler regenerator.
No text, borders, labels, arrows or added graphics. Same nine designs with safer smaller consistent centered atlas placement; authentic transparency required.
```

