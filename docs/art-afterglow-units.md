# Afterglow units atlas — green-screen runtime source

Status: **Green-screen RGB source for dedicated runtime chroma-key material.** This is deliberately opaque, not a transparent PNG. The first generation and targeted alpha-repair failed transparency acceptance; a subsequently authorized background edit replaced the checkerboard with vivid green. Use the dedicated material before compositing; do not render this source with an ordinary sprite material.

The selected visual reference is `docs/art-directions/C2-afterglow-details.png` (Afterglow Defense / 余晖防线). It was inspected locally and supplied to the built-in `image_gen` tool as the style reference. One generation call, one authorized targeted alpha-repair edit and one authorized green-screen edit were made. All used built-in image generation; no CLI/API fallback and no algorithmic image editing were used. The workspace asset now contains the green-screen output; all prior generated originals are retained at the recorded source paths.

## Files and verification

- Output: `assets/resources/art/afterglow-units.png`.
- Original built-in output: `C:\Users\26442\.codex\generated_images\01a07510-9c1c-7682-8b16-7a7cbfee4a73\exec-06d8eeb2-6f16-464d-9c52-88194a735b36.png`.
- Actual dimensions: **1774 × 887**, RGB 24-bit PNG. The current accepted source format is opaque green-screen RGB, rather than native RGBA.
- Current green-screen corner RGB: top-left (36,235,24), top-right (34,236,21), bottom-left (34,235,23), bottom-right (35,241,23). Central gutter RGB (17,245,13). The generated green is close to saturated chroma green but **not uniform exact #00FF00**. Use green-dominance chroma-key tolerance, never exact RGB equality. No green removal has been applied to the source image.
- A complete-atlas Cocos sprite-frame `.meta` retains its original UUID, actual dimensions and vertices, no trimming, nominal center pivot, truthful `hasAlpha: false`, and `packable: false` for stable runtime Rect slicing and a dedicated material.
- Original generated PNG is retained and copied without transformations.

## Layout

The visual order is correct: row 1 empty hull / cannon module / fan module / flame module; row 2 tesla module / cryo module / enemy humanoid / locomotive. All eight isolated subjects are visible and remain separate.

Nominal 4-column, 2-row equal cell dimensions are **443.5 × 443.5** pixels. This odd output size does not yield integer texel cell boundaries. Nominal upper-left-origin cell rectangles are `Rect(col * W/4, row * H/2, W/4, H/2)`. Runtime integration owns fractional-coordinate handling and green-key material verification.

Source-image inspection: cannon/flame point right. Hull axis is vertical. Fan has four independent blades and enemy is dark indigo. The locomotive's nose appears toward bottom, contrary to requested top-facing direction, so a future accepted version would need a 180-degree runtime orientation correction. Mechanical pivots are not exactly aligned to nominal cell centers (notably cannon/flame); runtime offset calibration would still be needed. Some objects use slight illustrated depth despite the strict orthographic prompt.

## Full built-in prompt

```text
Use case: stylized-concept. Asset type: production transparent sprite atlas for a topdown game. Transform the visual style of the attached reference into ONE clean reusable SPRITE SHEET. Reference image is STYLE ONLY: use its hand-drawn near-black ink contours, pale warm gray armored metal, muted violet shadow planes, and restrained peach sunset edge light. Do not reproduce the reference poster, UI, text, scenery or layout.

OUTPUT: a 2048 x 1024 transparent PNG atlas, landscape 2:1 aspect ratio. EXACTLY FOUR COLUMNS and TWO ROWS of equal square 512 x 512 cells. Invisible grid; no lines, borders, labels or panels. Each cell contains exactly ONE isolated object, centered on its own cell pivot. All eight cells must have the SAME width and height. All background pixels genuinely transparent alpha 0, including between objects. No black backdrop or painted checkerboard. Every object must remain within the middle 76% of its cell, leaving at least 12% transparent margin on all four sides. No object may cross or touch cell boundaries.

Camera for EVERY OBJECT: STRICT ORTHOGRAPHIC TOP-DOWN, directly overhead, never isometric, never three-quarter, never side view. These are game pieces composited at small sizes. Strong visibly hand-drawn black outline, angular simplified silhouette, about 5–12 broad shapes per object. A few broad painted shading planes and subtle painterly edges; no photorealistic 3D gloss, gradients, dense weathering, texture noise, bolt forests or tiny details. Unity across all eight objects. Pale warm gray armor, violet shadows and peach rim light, subdued saturation.

EXACT CELL ORDER:
ROW 1 COLUMN 1, center (256,256): EMPTY TRAIN CARRIAGE HULL. Simple compact square-ish pale armored deck, main train axis vertical, four dark wheels visible along left/right sides, short couplers at top/bottom. The deck CENTER IS EMPTY, no weapon, no symbol, no hatch or circular pedestal, clean open mounting space.
ROW 1 COLUMN 2, center (768,256): CANNON WEAPON MODULE ONLY. Round simple swivel base centered EXACTLY at the cell center; chunky short cannon barrel points horizontally RIGHT (+X, three o'clock). Barrel projects right, so do not recenter its overall bounding box. No carriage hull, wheels, coupler, floor or background under weapon.
ROW 1 COLUMN 3, center (1280,256): FAN ROTOR MODULE ONLY. Exactly FOUR broad pale blades with soft muted cyan accents around one centered circular hub. Rotor only, no fixed outside cage, base deck, train or carriage. Pivot at exact cell center.
ROW 1 COLUMN 4, center (1792,256): FLAMETHROWER WEAPON MODULE ONLY. One short thick nozzle pointing horizontally RIGHT (+X), round swivel centered exactly at cell center and two simple small muted peach fuel cells. No baked flames, smoke, hull, wheels or carriage.
ROW 2 COLUMN 1, center (256,768): TESLA WEAPON MODULE ONLY. A simple concentric circular coil centered at cell center, one cyan center and two large muted violet capacitors. No baked lightning, no chassis, wheels or carriage.
ROW 2 COLUMN 2, center (768,768): CRYO WEAPON MODULE ONLY. One large simple ice-blue faceted crystal on a short pale gray circular mount, black outlines and violet shadows, centered at cell center. No snow particles, no hull or wheels.
ROW 2 COLUMN 3, center (1280,768): ONE COMPACT HUMANOID ENEMY, overhead view of head, shoulders, compact torso and four visible limbs, facing TOP. Dark indigo silhouette with near-black outlines, only a few subdued violet planes and tiny muted peach accent. Deliberately darker and quieter than the player equipment. Not a spider, monster swarm or portrait; one compact overhead humanoid game sprite.
ROW 2 COLUMN 4, center (1792,768): ONE COMPACT LOCOMOTIVE facing TOP, vertically aligned, short pale armored train engine, dark wheels along sides and a short rear coupler, simple angular front nose, one dark roof window. No weapon, smoke trail, railway, ground or environment.

No words, numbers, labels, icons, UI decorations, connector lines, arrows or separate color swatches anywhere. Exactly eight isolated sprites in a rigorously uniform 4-by-2 grid. Actual transparent alpha, no scene.
```

## Authorized targeted repair — still failed

A single built-in background-extraction edit used `assets/resources/art/afterglow-units.png` as its edit target after local visual inspection. Output: `C:\Users\26442\.codex\generated_images\01a07510-9c1c-7682-8b16-7a7cbfee4a73\exec-eff53313-fe2e-4f19-9419-7fb37b265b9f.png`. Actual 1774 × 887, Format24bppRgb, sampled minimum alpha 255 and zero transparent samples. The checkerboard remains baked into the RGB pixels. The repair does not improve acceptance, so the workspace asset was not replaced. No additional generation was attempted.

```text
Use case: background-extraction. Edit the supplied existing sprite atlas. ONLY REMOVE THE ENTIRE BAKED WHITE AND LIGHT-GRAY CHECKERBOARD BACKGROUND and replace those pixels with genuinely transparent alpha zero. This includes all background between sprites, corners, cell gutters and empty areas around contours. Output must be a real RGBA PNG with an actual alpha channel, NOT a depiction of transparency. Preserve the eight sprite subjects, their hand-drawn colors, dark outlines, shapes, every object position, relative scale, 4-column 2-row cell order, and landscape 2:1 canvas exactly. Keep the existing 1774x887 size if supported. Do not redraw or redesign the sprites. Do not add any background color, checkerboard pattern, white mat, black mat, shadow or new element. Keep each sprite opaque, retain clean antialiased outline edges; outside the eight isolated silhouettes must be physically transparent. The required deliverable is a transparent sprite-sheet cutout ready to overlay directly on a game battlefield.
```

## Authorized green-screen edit — current workspace output

Current generated source: `C:\Users\26442\.codex\generated_images\01a07510-9c1c-7682-8b16-7a7cbfee4a73\exec-819a4235-e901-4f76-945f-2989347574db.png`. The eight subjects remain visually consistent with the original atlas and preserve the 4-by-2 order. Saturated green replaces the checkerboard, including visible subject openings. The actual green varies slightly; measured corner/gutter colors are recorded above. This image is preserved byte-for-byte, with no algorithmic changes.

```text
Use case: precise-object-edit. Edit the supplied existing eight-sprite atlas ONLY by replacing ALL baked white/light-gray checkerboard background with ONE EXACTLY UNIFORM SOLID CHROMA GREEN color #00FF00 (RGB 0,255,0). This is deliberately an OPAQUE RGB GREENSCREEN IMAGE, NOT transparent. Every background pixel in corners, gaps, cell gutters, and hollow openings within equipment MUST be the same perfectly flat #00FF00. Preserve the eight equipment/enemy drawings EXACTLY: pale warm gray armor, violet shadow planes, peach edge light, dark hand-drawn outlines, all shapes, positions, relative sizes, 4-column 2-row layout and 1774x887 landscape canvas. Do not tint subjects green. No green reflections, green light spill, color contamination, ground shadows, gradients or texture in green background. No checkerboard, added objects, words or borders. Only background becomes vivid fully saturated pure green, all subject art unchanged.
```
