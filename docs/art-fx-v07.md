# Attack and impact VFX atlas v07

Generated on 2026-09-10 with the built-in `image_gen` tool. No CLI/API fallback. Two attempts: initial design, then one targeted layout correction for safer padding. Selected output copied unchanged to the project; no manual raster processing.

- Asset: `assets/resources/art/afterglow-fx-v07.png`
- Cocos metadata: `assets/resources/art/afterglow-fx-v07.png.meta`, new UUID, untrimmed full image, packing disabled.
- Dimensions: 1536 × 1024; four columns × two rows; cells 384 × 512.
- SHA-256: `9f3db440bea5bc781a93eec77027e28285fd953ddc9139a9e5029b7fb163e471`
- Initial source: `C:/Users/26442/.codex/generated_images/01a0872d-303a-76a0-ac70-193dc3cef332/exec-6978eb9f-523d-4df8-9100-354859fb1b9b.png`
- Selected source: `C:/Users/26442/.codex/generated_images/01a0872d-303a-76a0-ac70-193dc3cef332/exec-dbabcea5-fe77-4088-9fc5-be50f8ea483f.png`
- References inspected: `assets/resources/art/afterglow-fx-v06.png` and `docs/art-directions/C2-afterglow-details.png`; both supplied on the first generation request.

## Frame semantics

| Index | Sprite |
|---|---|
| 0 | Peach/ivory horizontal needle projectile pointing right |
| 1 | Airy cyan wind crescent |
| 2 | Ice-blue radial crystal shatter |
| 3 | Warm orange flame lobe curling right |
| 4 | Pale mint/ivory support-charge diamond halo |
| 5 | Ivory/peach needle-like kinetic impact starburst |
| 6 | Orange/gold fire spiral with hollow black center |
| 7 | Lavender branching electric burst |

## Inspection and measured limits

The saved image and all eight visible cells were inspected. No text, grid lines, dividers, checkerboard, UI or neighboring sprite spill was observed. Compared to v06, the shatter has separated crystal shards, wind has brighter fine cyan filaments, the kinetic hit has a compact bright core, the fire vortex is correctly warm orange, and the electric hit is a lavender branching burst.

Read-only Pillow checks verified dimensions and measured a maximum channel value of 1 in every cell's outer 8-pixel boundary. Thus the result is visually black for additive blending but not mathematically zero at every background pixel; no claim of exact RGB-zero background is made. Strong pigment (maximum RGB channel >12) bounding boxes, in local cell coordinates, are recorded below. Most horizontal margins are roughly 20–30% rather than uniformly 25%; all cell boundaries remain clean. The artwork now occupies about 50–60% of frame width; consumers should inspect gameplay scale when swapping the more tightly filled v06 atlas. Lower-row sprite cores sit somewhat above the geometric cell midpoint.

| Cell | Strong pigment bounds (left, top, right, bottom) |
|---|---|
| 0 | 91, 217, 318, 298 |
| 1 | 115, 157, 300, 357 |
| 2 | 90, 160, 284, 351 |
| 3 | 77, 192, 284, 325 |
| 4 | 91, 135, 305, 310 |
| 5 | 76, 90, 312, 358 |
| 6 | 87, 121, 294, 328 |
| 7 | 85, 122, 291, 334 |

## Initial prompt

```text
Use case: stylized-concept. Make ONE production VFX sprite atlas image, landscape 1536x1024 pixels, exactly FOUR equal columns and TWO equal rows, 8 isolated sprites, each invisible cell is 384x512. Entire canvas background must be PERFECT SOLID RGB BLACK #000000 for ADDITIVE game blending. NO transparency checkerboard, NO paper background, NO tinted background. Images provided are references: first is older VFX sheet for item order only; second is art direction for sophisticated twilight gouache and tapering ink strokes only. Redesign the eight effects with more refined layered filaments, strong tiny ivory cores, intentional sparse broken painterly edges, directional brush energy. No blurry neon globes, no solid color discs. Each effect precisely centered in its own cell, with approximately 25 percent BLACK MARGIN on each side of that cell; NOTHING crosses cell boundaries. Absolutely NO grid lines, cell dividers, labels, text, numbers, interface, border or watermark. NO scene/train/characters. Use straight-on orthographic sprite view. Row-major semantics MUST match these exact eight positions: TOP LEFT (index0) a narrow horizontal peach-ivory needle projectile/light streak pointing RIGHT, luminous pin tip on right, thin tapering trailing parallel lines left, very restrained width of pigment. TOP SECOND (index1) an airy pale CYAN crescent wind slash, open crescent with three fine feathering strokes, generous black negative space. TOP THIRD (index2) a pale ice-blue radial crystal SHATTER with small sharp faceted fragments scattering out from a tiny white central hit, lavender-blue undersides, scattered separated shards not a solid wreath. TOP RIGHT (index3) one SMALL warm peach/orange flame lobe curling RIGHT with two delicate tapered wisps, sharp ivory flicker core and rust-red outer fragments, not an explosive fireball. BOTTOM LEFT (index4) a pale MINT and IVORY support-charge diamond halo: a tiny central diamond, an elegant thin elliptical orbit, sparse small glints, clean restrained luminous sigil. BOTTOM SECOND (index5) a warm IVORY needle-like KINETIC IMPACT STARBURST: very small bright central point, four long thin unequal tapering spikes, a few fine peach splinters, minimal background pigment. BOTTOM THIRD (index6) a HANDPAINTED ORANGE FIRE SPIRAL / VORTEX circle: loose curled orange-gold flame strokes with broken trailing ember fragments around a clearly hollow black center, not purple, not a portal or filled circle. BOTTOM RIGHT (index7) a LAVENDER ELECTRIC BURST radiating thin jagged branching lightning from a tiny white center: asymmetric separated forks, cool violet secondary branches, no orange flame and no blue/orange split. All eight have distinguishable silhouettes, crisp tapered lit edges and subtle dark colored pigment falloff on black, high-end hand-drawn gouache fantasy machine-combat effects. Keep effects small enough inside their cells to crop independently with completely black surrounding boundaries.
```

## Targeted layout correction prompt

```text
Precise sprite-atlas layout edit of the supplied image. Preserve ALL EIGHT current effects, their order, colors, shapes, brush texture and design EXACTLY. Change ONLY each effect's scale and position: shrink each individual complete effect to 55 percent of its current width and height, and center it inside its correct cell. Keep canvas exactly1536x1024, four equal columns by two equal rows, cells384x512. Desired centers: top row (192,256),(576,256),(960,256),(1344,256); bottom row (192,768),(576,768),(960,768),(1344,768). Each effect should occupy NO MORE THAN the middle50percent of its cell width and height, leaving at least25percent perfectly black padding on each side. This large safe black margin is essential for independent game-engine cropping. Keep exactly eight sprites in original rowmajor order: rightward needle, cyan windcrescent, blue ice shatter, rightward orange flame; mint diamond charge halo, ivory impact star, orange fire spiral, lavender electric burst. DO NOT add effects, particles outside margins, dividers, labels, numbers or borders. Entire background MUST be solid pure RGB(0,0,0), no gray, no vignette, no transparent checker. Preserve original painterly quality and lit finefilaments. This is resizing/repositioning the existing sprite contents onto black, no style redesign.
```

