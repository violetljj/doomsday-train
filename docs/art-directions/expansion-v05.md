# Afterglow gameplay expansion v05

## Output

- Asset: `assets/resources/art/afterglow-expansion-v05.png`.
- Actual dimensions: **1774 × 887**, opaque 24-bit RGB PNG.
- Intended layout: **4 columns × 2 rows**. Nominal equal cell size **443.5 × 443.5 px**; use the same rounded runtime Rect boundaries as the existing atlas.
- Built-in source: `C:\Users\26442\.codex\generated_images\01a07510-9c1c-7682-8b16-7a7cbfee4a73\exec-b77e69dd-17b3-4da2-a7b2-3777155a121c.png`.
- Mode: **built-in image_gen**, exactly one call, no variants or subsequent editing.
- Inspected/attached references: `assets/resources/art/afterglow-units.png` for atlas layout and equipment palette, `docs/art-directions/C2-afterglow-details.png` for the selected hand-painted dusk direction.
- Workspace PNG SHA-256 matches the original generated PNG. Original retained. No matting, cropping, image processing or resizing.

## Inspected cell order

| Index | Row | Column | Subject | Observation |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | Railgun | Two long parallel rail arms point UP; independent circular mount, no hull. |
| 1 | 0 | 1 | Prism | Three large pale lavender faceted mirrors form a triangular array. |
| 2 | 0 | 2 | Acid | Two mustard/ochre tanks and chunky pipes, no green chemicals. |
| 3 | 0 | 3 | Basic scavenger | Ragged ink-violet humanoid mechanical silhouette. |
| 4 | 1 | 0 | Barrier | Squat broad shield-shaped dark carapace with peach seams. |
| 5 | 1 | 1 | Brood | Asymmetric dusty-pink pod cluster with dark articulated limbs. |
| 6 | 1 | 2 | Regenerator | Thin pale-lavender segmented body with a clear amber central core. |
| 7 | 1 | 3 | Armored walker | Heavy angular dark humanoid with broad shoulders and stout limbs. |

All eight separate subjects are visible in the correct order and do not cross into adjacent cells. Painted uneven warm/cool patches and dark pencil/ink contours are visible; no text, grid lines, UI decoration, train hulls under modules, or separate scene backgrounds appear.

## Chroma-key and integration limits

The requested flat #00FF00 background is returned as a slightly variable saturated green. Measured corner RGB: TL (38,226,24), TR (38,229,20), BL (35,228,19), BR (36,233,21); central gutter (20,235,12). Use tolerant green-dominance keying, not exact RGB equality. No obvious green subject pigments were observed. This is an intentional RGB chroma-key source, not a native transparent PNG.

The requested minimum 15% cell inset is **not met uniformly**. For example, the regenerator starts about 27px below its row boundary, less than 15% of 443.5px. Subjects remain discrete and do not overlap across cells. No regeneration was performed, following the single-call instruction.

Generated mechanical pivots are not exact cell centers. Railgun circular pivot is approximately source coordinate **(241,301)** versus first-cell center **(221.75,221.75)**. This suggests a runtime Sprite-child shift of about **-0.043 × displayed cell width** in local X and **+0.179 × displayed cell height** in local Y under a centered rotation parent (Cocos Y-up). These are source-image estimates; runtime inspection must confirm them. Barrel points UP, as requested, and the caller owns the corresponding fixed angle offset.

Some figures retain mild illustrated depth and visible front body planes; they are overhead game-style drawings rather than mathematically exact orthographic models.

No code, metadata, build, browser/Sites settings or commits were changed by this subtask. Runtime integration and small-size readability checks belong to the root task.

## Full prompt

```text
Use case: stylized-concept. Asset type: actual gameplay sprite atlas, not concept poster. Create ONE 2048x1024 landscape 2:1 raster sheet with EXACTLY FOUR COLUMNS and TWO ROWS of EIGHT EQUAL SQUARE CELLS. Invisible grid, no border, no labels. Every single cell contains ONE separate centered weapon/support module or enemy creature. Every object must fit within the middle 70% of its own cell, leaving minimum 15% flat green margin on all four sides. No overlaps, no crossing cell borders.

Background: deliberately OPAQUE, perfectly uniform saturated chroma GREEN #00FF00 everywhere outside subjects, including hollow openings. NO background shadow, texture, gradient, checkerboard, glow, scenery, terrain or floor. NO GREEN PIGMENTS ANYWHERE ON SUBJECTS, since green will be removed by runtime shader.

References: first image establishes eight-cell atlas layout, palette and sprite scale; second image establishes Afterglow Defense hand-painted dusk art direction. Make NEW subjects specified below. Do not copy text, panels, environment or background scenery from the references.

Rendering: strongly HAND-PAINTED GOUACHE with clearly uneven overlapping warm/cool COLOR BLOCKS, matte dry-brush patches and hand-drawn pencil/ink contours with occasional lost edges. Simplified bold clean silhouettes and few large color planes, legible at small mobile-game sizes. Warm pale gray/beige player metal, dusky lavender-violet shadows, muted peach highlights. Enemies mostly ink-violet/dark plum with few subdued distinguishing accent blocks. No glossy 3D surfaces, photoreal weathering, dense rivets, tiny intricate mechanisms or noisy all-over texture. Entire scene camera STRICTLY ORTHOGRAPHIC DIRECTLY TOP-DOWN for every item: not isometric, not frontal or side view. No car hulls, train decks, wheels or chassis under the first three modules.

EXACT ORDER left-to-right top-to-bottom:
ROW 1 COLUMN 1 / CELL 0: RAILGUN MODULE. One compact circular swivel mount centered at the exact cell center with TWO parallel elongated straight rail arms pointing UP toward the top of the sheet (+Y in game), forming a distinctive long twin-rail cannon with open narrow center channel. Warm beige metal and near-black ink interiors, peach edge planes; long barrel UP. No carriage hull.
ROW 1 COLUMN 2 / CELL 1: PRISM SUPPORT MODULE. Exactly THREE broad faceted pale-lavender LIGHT MIRRORS arranged in a triangular optical array around a small shared central mount. White-lavender matte glass planes with subtle peach accents. Nondirectional, centered triangle composition. No rays, lens flare, green glass or car hull.
ROW 1 COLUMN 3 / CELL 2: ACID SUPPORT MODULE. TWO stout muted MUSTARD/OCHRE CHEMICAL TANKS with a couple of simple thick pipes and short nozzle shapes, mounted as one compact standalone centered module. Clearly warm ochre, NOT green or lime. Simple beige/dark-violet supports, nondirectional compact silhouette. No acid spray, aura or car hull.
ROW 1 COLUMN 4 / CELL 3: BASIC ENEMY. One small ragged INK-VIOLET HUMANOID MECHANICAL SCAVENGER viewed from above, a compact head, angular shoulders, torn dark cloak scraps and visible two arms/two legs. Face/front toward TOP, subdued dusty-violet planes, low contrast so it does not compete with player units. No weapon prop separate from body.

ROW 2 COLUMN 1 / CELL 4: BARRIER ENEMY. One squat broad dark creature carrying a large faceted DARK SHIELD-like armored carapace. Compact overhead silhouette, broad shoulders, stubby limbs, a few PEACH SEAMS divide big shield planes. Front toward TOP. Deliberately wider and shorter than the humanoid.
ROW 2 COLUMN 2 / CELL 5: BROOD CREATURE. One asymmetric compact creature with overlapping layered EGG PODS in DUSTY PINK and dark-violet connective shell, about four or five large rounded pod forms and a few short ink legs. Overhead view, irregular but clean discrete silhouette. No scattered separate eggs.
ROW 2 COLUMN 3 / CELL 6: REGENERATOR. One THIN PALE-LAVENDER SEGMENTED CREATURE with an obvious single warm AMBER CORE visible along its center, a narrow elongated body of a few broad plate segments and thin curled limbs. Front toward TOP. Do not use green regeneration particles, halos or medical symbols.
ROW 2 COLUMN 4 / CELL 7: ARMORED WALKER ENEMY. A heavier angular version of the reference's dark humanoid/mechanical enemy, overhead compact broad shoulder armor, stout limbs, layered dark ink-violet plates and a restrained peach visor edge. Front toward TOP, distinct from the squat shield enemy by its clearly humanoid articulated legs.

Exactly eight isolated centered objects in the specified equal 4x2 cells. Each discrete silhouette has at least 15% inset and a fully unshadowed flat vivid green surround. No text, words, numbers, labels, symbols, border, separate swatches or decorative UI.
```
