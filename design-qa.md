# Design QA: railway visual language

Reference: docs/art-directions/universal-ui-v1/concept.png (opened this session).
Implementation: Cocos web-mobile, IAB 390×844 captures in this session.

Partial implementation; not a full concept handoff.

- Typography: bundled fonts, readable hierarchical HUD labels, fixed widths. Reference wording changed intentionally to actual game values.
- Layout: three aligned top instruments and five-slot bottom dock are implemented. Original battle framing remains intentional; generated speedometer and route strip omitted because the game has no corresponding mechanic.
- Colors/materials: generated enamel/brass assets now replace plain generic HUD plates. Bright salt flats and aurora have readable backplates. Primary action uses light brass with dark text.
- Assets: dedicated reference-guided instrument and dock raster images, aspect-preserving crops. Existing train and equipment retained intentionally. Earlier generic plate implementation was insufficient and has been replaced on main HUD.
- Interaction: button opens workshop, slot 3 selects index 2, workshop returns to combat, pause works.
- Fixed defect: title chroma-key material was lost on workshop transition; restored and verified with post-fix screenshot.

Outstanding P2: supply cards and workshop slots still use older internal composition; four linkage tier presentations and gameplay remain unimplemented. Full source-vs-implementation comparison across these states is pending. Do not claim full visual-language acceptance.

final result: blocked

This result describes incomplete design delivery, not an external execution blocker. Continue implementation in the active goal.
