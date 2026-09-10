# Afterglow typography

Current UI families are Afterglow Modern Title / Body, renamed Noto Sans SC derivatives at weights 600 / 450. `NotoSansSC-OFL.txt` retains the full upstream license. `tools/build-modern-fonts.py` pins the source URL and SHA-256, preserves license records, and subsets characters in `assets/scripts`. Run it after changing game text, then run it with `--check` to verify coverage. Source fonts stay in ignored `temp/font-sources`; runtime TTFs and the receipt are retained in the project.

Current damage numerals are Afterglow Wake v6: twelve original closed vector silhouettes, without an external numeral font. Run `node tools/generate-swept-digits.mjs` with a local `PLAYWRIGHT_PATH` when needed. The transparent atlas has twelve 96×128 cells per row, `0123456789.-`, and five semantic rows: normal, heavy, tick, shield, incoming. See `docs/art-original-numerals.md` for optical design and presentation. `node tools/fonts/preview.mjs` renders the current specimen.

Earlier Ma Shan Zheng / LXGW WenKai derivatives and Permanent Marker sources retain their licenses for historical reproducibility. Game no longer loads those families or the v2–v5 damage atlases.
