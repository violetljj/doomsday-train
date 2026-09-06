# Hand-painted UI paper v2

## Deliverable

- Workspace asset: `assets/resources/art/afterglow-paper-v2.png`.
- Actual dimensions: **941 × 1672**, approximately 9:16 portrait.
- Format: opaque RGB 24-bit PNG. This is an intentional full-screen panel background.
- Built-in generated source: `C:\Users\26442\.codex\generated_images\01a07510-9c1c-7682-8b16-7a7cbfee4a73\exec-e3ea45fa-84e5-446e-86db-6e73b4958c7e.png`.
- Mode: **built-in image_gen**, one image call, no CLI/API fallback.
- Style reference: `docs/art-directions/C2-afterglow-details.png`, locally inspected and attached as a color/atmosphere reference only.
- The new workspace PNG matches the generated source SHA-256 exactly. No image editing, crop, resize, alpha processing, or replacement of existing art was performed.

## Visual inspection

The selected output has visible irregular gouache color blocks, broad lavender/violet dry-brush patches, broken painted edges and warm peach patches near the upper-right and lower margins. It is visibly painted rather than a smooth purple gradient. The large central region is quiet dark indigo-violet; sampled center RGB is **(39,37,65)**, suitable as a dark backing for warm-white UI text pending the final in-game readability check.

Sparse graphite reeds sit along the left edge and a railway coupling study occupies the lower-right. The coupling sketch reaches farther inward than the requested outermost 6–9%, but remains dark and low-contrast. There is no readable text, interface button, panel frame, central train or central focal object.

The user's follow-up clarified the desired direction as *13 Sentinels: Aegis Rim* and uneven color blocks after generation had already begun. The call was not restarted; the delivered image already uses uneven overlapping cool/warm brush patches consistent with that requested treatment. No second image was generated.

No code, metadata, build configuration, Sites settings, or `.openai` files were touched in this subtask. Runtime implementation and final scene/UI verification belong to the root task.

## Full prompt

```text
Use case: stylized-concept. Asset type: full-screen raster background for a portrait mobile game's workshop, supply, pause and results panels. Create ONE portrait 9:16 image (720x1280 or equivalent aspect ratio). OPAQUE full-bleed painted paper, no transparency.
The supplied image is ONLY a color/atmosphere reference: lavender-indigo dusk, muted peach evening light and delicate hand-drawn sensibility. Create a NEW background artwork; do not reproduce the reference's UI, text, figures, trains, panel frames or layout.

Art direction: a genuinely HAND-PAINTED gouache and pencil field-journal page at dusk. The paint must look physically made with a broad dry brush on rough watercolor paper: CLEAR VISIBLE irregular interlocking patches of matte gouache, a few layered brush passes, broken bristle marks, scumbled pigment and natural lost edges. This is not a smooth digital gradient with noise applied. Purple-indigo paper itself is the subject, quietly atmospheric, with soft lavender and dusty peach evening-cloud color brushed around the OUTERMOST margins.

Composition for legibility: reserve the central 76% of the width and 82% of the height as a large DARK low-contrast quiet uninterrupted painting surface for many lines of warm-white interface text to be overlaid later. The central darkness should be muted ink-indigo / deep warm lavender, approximately #27283E to #333149, with very broad subdued brush patches visible but no sharp/high-contrast marks or bright clouds. Do NOT draw a rectangular panel or frame around this center. Let the dark paper naturally blend into painted edges.

At the extreme outer margins ONLY, within the outer 6–9% of the canvas, add sparse, delicate loose graphite-pencil studies: a tiny partial railway coupling/mechanical joint sketch at one lower corner and two or three thin botanical reed stems along the opposite edge, like incidental field-journal observations. These must be faint and cropped naturally by the page edge, never become focal illustrations. Warm peach gouache strokes at upper/right and lower margins resemble evening cloud scraps; do not brighten the center. Keep margins asymmetrical and organic with generous quiet space.

Palette: lavender, violet-gray, dark indigo, dusty mauve and small warm peach touches. NO sepia, brown parchment, beige scrapbook, paper tears, taped notes, stickers or coffee stains. NO neon, cyan holograms, glossy metallic UI, 3D render, airbrush smooth gradient, heavy all-over grain, dramatic center light or obvious vignette ring. No letters, words, numbers, symbols, labels, buttons, lines for writing, readable technical notations, UI controls, train silhouette or central object. Only a richly hand-painted dusk-paper background with a calm dark center.
```
