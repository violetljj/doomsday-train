"""Build the two weights of the project's modern CJK family from pinned OFL source."""
import argparse, hashlib, json, sys, urllib.request, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'temp/font-build-python'))
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
url='https://raw.githubusercontent.com/google/fonts/406197b91ff39a93061c2c2eeaee67ddf2ae1f0d/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf'
sha='a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da'
source=ROOT/'temp/font-sources/NotoSansSC-variable.ttf'
out=ROOT/'assets/resources/fonts';out.mkdir(parents=True,exist_ok=True)
text=''.join(p.read_text(encoding='utf-8-sig') for p in (ROOT/'assets/scripts').rglob('*.ts'))
chars=set(range(32,127))|{ord(c) for c in text if ord(c)>=160}
required={c for c in chars if 0x3400<=c<=0x9fff}
if not args.check:
    source.parent.mkdir(parents=True,exist_ok=True)
    if not source.exists():urllib.request.urlretrieve(url,source)
    assert hashlib.sha256(source.read_bytes()).hexdigest()==sha,'Pinned font source hash mismatch'
report={'upstream':'Noto Sans SC','url':url,'source_sha256':sha,'license':'tools/fonts/NotoSansSC-OFL.txt','roles':{}}
for role,weight in [('title',600),('body',450)]:
    target=out/f'afterglow-modern-{role}.ttf'
    if args.check:
        f=TTFont(target);missing=required-set(f.getBestCmap())
        assert not missing,f'{role}: missing '+''.join(map(chr,sorted(missing)))
        print(f'{role}: all {len(required)} source CJK characters covered');continue
    f=TTFont(source,recalcTimestamp=False);available=set(f.getBestCmap())
    assert not required-available,'Source lacks required Chinese glyphs'
    options=subset.Options();options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.recalc_timestamp=False
    cutter=subset.Subsetter(options=options);cutter.populate(unicodes=chars&available);cutter.subset(f)
    instantiateVariableFont(f,{'wght':weight},inplace=True)
    family=f'Afterglow Modern {role.title()}'
    names={1:family,2:'Regular',3:family+' Regular 1.0',4:family,6:family.replace(' ','')+'-Regular',16:family,17:'Regular'}
    for n in f['name'].names:
        if n.nameID in names:n.string=names[n.nameID].encode(n.getEncoding())
    f.save(target)
    meta=Path(str(target)+'.meta')
    if not meta.exists():meta.write_text(json.dumps({'ver':'1.0.1','importer':'ttf-font','imported':True,'uuid':str(uuid.uuid4()),'files':['.json','.ttf'],'subMetas':{},'userData':{}},indent=2)+'\n')
    report['roles'][role]={'weight':weight,'bytes':target.stat().st_size,'glyphs':len(f.getBestCmap()),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'missing_symbols':''.join(map(chr,sorted(chars-available)))}
    print(role,report['roles'][role])
if not args.check:
    (ROOT/'tools/fonts/modern-subset-receipt.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    license_target=out/'modern-font-license.txt'
    license_target.write_text('Afterglow Modern Title and Body are subset, static-weight derivatives of Noto Sans SC.\n\n'+(ROOT/'tools/fonts/NotoSansSC-OFL.txt').read_text(encoding='utf8'),encoding='utf8')
    meta=Path(str(license_target)+'.meta')
    if not meta.exists():
        template=json.loads((out/'typography-licenses.txt.meta').read_text())
        template=json.loads(json.dumps(template).replace(template['uuid'],str(uuid.uuid4())))
        meta.write_text(json.dumps(template,indent=2)+'\n')
