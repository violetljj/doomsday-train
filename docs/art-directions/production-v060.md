# 0.6.0 手绘资源落实

本轮使用内置 imagegen。主旨：暮色机械、水粉叠色、沿形体走向的笔触、少量精细结构、清晰轮廓和安静的大色面；避免塑料高光与均匀碎噪点。新资源与旧版本分开保留。

## 当前使用

- `assets/resources/art/afterglow-units-v06.png`：基础车体、武器与敌人。
- `assets/resources/art/afterglow-expansion-v06.png`：轨道炮、棱镜、蚀酸及扩展敌人。
- `assets/resources/art/afterglow-fx-v06.png`：水粉笔触攻击与联动效果，黑底加法混合。
- `assets/resources/art/afterglow-mods-v07.png`：6×3词条图集；生成图背景原为RGB棋盘格，前段通过背景连通区域处理生成alpha，不将原输出称为透明图。
- `assets/resources/art/afterglow-support-top-v08.png`：维修、护盾的正俯视模块，与基础图集共用绿幕材质。
- `assets/resources/art/afterglow-flame-v08.png`：黑底四阶段火焰，通过显式不等宽矩形裁切，并以加法混合消除黑底。四个完整形状不是等宽排布。

侧面支援车概念图、偏写实版本和中间火焰图保存于 `iterations-v06-v07/`，不进入游戏资源包。

## 提示词记录

词条：Redraw the 6x3 icon atlas as refined hand-painted gouache and ink. Preserve 18 semantic cells. Layer plum, rust, ochre, teal and cream pigments with directional dry-brush edges and paper highlights. Remove glossy 3D bevels, smooth gradients, thick uniform outlines and rectangular backgrounds. Request transparent background.

支援模块：Exactly two orthographic top-down equipment modules, repair workshop and circular shield generator. No wheels, tracks or side-view carriage. Ivory fabric, teal medical cross, brass tools; plum casing, copper coil, four turquoise emitters. Refined gouache with violet shadows, selective warm lights and tapered ink. Flat chroma-green background and generous cell padding.

喷火：Preserve four hand-painted stages: ignition, compact jet, full cone, fading smoke. Gouache, broken feathered contours, cream hot core, ochre/coral body and plum smoke. Curling tongues and detached embers. Final background correction requested solid black throughout gaps and smoke, no checkerboard. Actual output was inspected and cropped to the observed stage boundaries.

## 接入校正

- 图鉴打开时隐藏菜单插画，露出纸面纹理。
- 面板适配层尊重圆角矩形，避免将全部卡片再次转成大块多边形。
- Cocos字体参数使用单一字体族，正文sans-serif、标题serif；不将CSS字体列表直接传给Canvas字体族。
- 维修/护盾使用屋顶视角，卡面与战场方向一致。
