# 余晖防线 · 战斗效果图集

已选方向：3 / C2。实际资源：assets/resources/art/afterglow-fx.png。

模式：内置 image_gen。第一张返回的是烘焙棋盘格的 RGB 图，不是真透明；随后通过内置编辑改为纯黑背景。最终1774×887、4列2行，由Cocos在运行时切分SpriteFrame并以加法混合显示，未用脚本修改图像像素。

顺序：炮弹、风压、冰霜、火焰；联动蓄能、命中闪光、电流涡旋、冷热冲击。该图集用于实际战斗动画，手绘纹理与程序控制的转向、缩放、淡出结合。

原始生成：exec-c4520868-a6f0-43ce-9e76-0ccf167e389a.png；最终黑底：exec-439ec3c7-8fec-4527-ac1a-84a06045b343.png。两者原件均保留于C:/Users/26442/.codex/generated_images/01a072ca-5a7c-7560-bee2-e5dbe2d2b463/。

## 初次提示词

```text
Production VFX sprite atlas for original top-down mobile game 末日列车. Use supplied C2 reference for hand-painted anime-tactical visual style ONLY. Generate a TRANSPARENT PNG, 2048x1024, STRICT 4 COLUMNS x 2 ROWS of equal square cells. No words, numbers, backgrounds, borders, grids or checkerboard. Each effect fits entirely inside its cell with at least 10% empty transparent margin; NEVER cross cell boundaries. Eight isolated visual effects centered in their respective cells. True transparent alpha including empty centers, semi-transparent brush tapered edges.
Ordered left to right TOP ROW: 1 cannon projectile pointing RIGHT, peach ivory luminous narrow spear streak (origin at center left, point center right); 2 wind push crescent pointing RIGHT, pale cyan 3 tapering hand-painted crescent ribbons, transparent between ribbons; 3 frost ground burst, a loose circular arrangement of 6 flat pale blue ice slivers and brush frost, empty transparent center; 4 flame jet pointing RIGHT, short peach-orange plume with cream inner tips, painted sharp tapering edges, transparent between licks.
BOTTOM ROW: 5 linked weapon charge, 2 thin cyan ELLIPTICAL ORBITS around transparent center with 2 small glowing diamonds, faint bloom; 6 cannon IMPACT centered, peach-white four-point directional flare with sparse tiny inked spark shards, hard bright core and restrained bloom; 7 electric vortex, thin lavender/cyan broken swirling arcs, open center and no fog; 8 ice thermal burst, half pale blue sharp shards, half warm peach wisps radiating from a small ivory impact, open gaps.
Visual treatment: conspicuous 2D hand-painted illustration, variable width ink contours on solid shards, broad cel value grouping, dusk lavender shadows, powder-blue/cyan highlights, soft peach fire, elegant calligraphic tapers. Match the artistic rendering of reference not its UI labels. These are actual game sprites used over dark painted terrain; preserve readability, keep each silhouette simple and coherent at 80px. No photoreal smoke, no stock particle library sparkle, no neon rainbow, no thick opaque circles, no orange lava ball. Tight balanced content without cut off tips.
```

## 定向编辑提示词

```text
Edit this exact 4x2 effects atlas. REPLACE ALL white/checkerboard background with UNIFORM PURE BLACK #000000 including the transparent intended areas between strands, inside rings and all cell margins. This version will be rendered using additive blending by a game engine, so pure black is REQUIRED, not alpha and not checkerboard. Preserve precisely the same eight effects, their layout/positions, relative size, palette and hand-painted brush shapes. Effects should emit pale cyan, lavender, peach and ivory light against absolute black, with a dark fade to black at the outer soft edges. Do not introduce any grids, borders, text, new elements, haze across the black empty areas, or white checkerboard. Keep layout exactly 4 equal columns and 2 equal rows, each effect entirely inside its own cell with no overlaps. Strictly change the background/compositing treatment only. Black canvas, luminous illustrated effects.
```
