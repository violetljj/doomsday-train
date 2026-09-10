"""Subset pinned open-source fonts to game source characters; no system installs.

Requires fonttools==4.59.2. To use a task-local dependency:
  python -m pip install --target temp/font-build-python fonttools==4.59.2
  python tools/build-game-fonts.py
Use --check near release to verify source CJK coverage without rebuilding.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'temp/font-build-python'))
from fontTools import subset
from fontTools.ttLib import TTFont

args = argparse.ArgumentParser()
args.add_argument('--check', action='store_true')
args = args.parse_args()
source = json.loads((ROOT / 'tools/fonts/sources.json').read_text())
output = ROOT / 'assets/resources/fonts'
cache = ROOT / 'temp/font-sources'
output.mkdir(parents=True, exist_ok=True)
cache.mkdir(parents=True, exist_ok=True)
text = ''.join(path.read_text(encoding='utf-8-sig') for path in sorted((ROOT / 'assets/scripts').rglob('*.ts')))
chars = set(range(32, 127)) | {ord(c) for c in text if ord(c) >= 160}
required = {c for c in chars if 0x3400 <= c <= 0x9fff}
report = {}

for role in ('title', 'body'):
    info = source[role]
    target = output / f'afterglow-{role}.ttf'
    if args.check:
        font = TTFont(target)
        missing = required - set(font.getBestCmap())
        if missing:
            raise SystemExit(f'{role}: missing source CJK glyphs: {"".join(map(chr, sorted(missing)))}; rerun build-game-fonts.py')
        print(f'{role}: source CJK coverage verified ({len(required)} characters), {target.stat().st_size:,} bytes')
        continue
    original = cache / info['file']
    if not original.exists():
        urllib.request.urlretrieve(info['url'], original)
    if hashlib.sha256(original.read_bytes()).hexdigest() != info['sha256']:
        raise SystemExit(f'Source hash mismatch: {original}')
    font = TTFont(original, recalcTimestamp=False)
    available = set(font.getBestCmap())
    missing = required - available
    if missing:
        raise SystemExit(f'{role}: upstream missing source CJK: {"".join(map(chr, sorted(missing)))}')
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    options.recalc_timestamp = False
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=chars & available)
    sub.subset(font)
    # Distinct derivative family names preserve upstream reserved-name boundaries.
    family = f'Afterglow {role.title()}'
    replacements = {1: family, 2: 'Regular', 3: family + ' Regular 1.0', 4: family + ' Regular',
                    6: f'Afterglow{role.title()}-Regular', 16: family, 17: 'Regular'}
    for record in font['name'].names:
        if record.nameID in replacements:
            record.string = replacements[record.nameID].encode(record.getEncoding())
    font.save(target)
    meta = target.with_suffix('.ttf.meta')
    if not meta.exists():
        meta.write_text(json.dumps({'ver': '1.0.1', 'importer': 'ttf-font', 'imported': True,
            'uuid': str(uuid.uuid4()), 'files': ['.json', '.ttf'], 'subMetas': {}, 'userData': {}}, indent=2) + '\n')
    report[role] = {'upstream': info['upstream'], 'source_sha256': info['sha256'],
        'subset_sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size,
        'glyphs': len(font.getBestCmap()), 'source_cjk_characters': len(required),
        'unsupported_non_cjk': ''.join(map(chr, sorted(chars - available)))}
    print(f'{role}: {target.stat().st_size:,} bytes, {len(font.getBestCmap())} glyphs')

if not args.check:
    (ROOT / 'tools/fonts/subset-receipt.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
