"""Create Cocos sprite metadata from an image's dimensions without altering pixels."""
import json
from pathlib import Path
import sys
import uuid
from PIL import Image

root=Path(__file__).resolve().parents[1]
for value in sys.argv[1:]:
    path=Path(value).resolve()
    if not path.is_relative_to(root/'assets'):
        raise SystemExit('Raster must be inside project assets')
    meta=path.with_suffix(path.suffix+'.meta')
    if meta.exists():
        continue
    image=Image.open(path);w,h=image.size
    data=json.loads((root/'assets/resources/art/afterglow-ground-v2.png.meta').read_text(encoding='utf-8-sig'))
    old=data['uuid'];new=str(uuid.uuid4())
    data=json.loads(json.dumps(data).replace(old,new).replace('afterglow-ground-v2',path.stem))
    u=data['subMetas']['f9941']['userData']
    u.update(width=w,height=h,rawWidth=w,rawHeight=h,offsetX=0,offsetY=0,trimX=0,trimY=0)
    u['vertices']={'rawPosition':[-w/2,-h/2,0,w/2,-h/2,0,-w/2,h/2,0,w/2,h/2,0],
      'indexes':[0,1,2,2,1,3],'uv':[0,h,w,h,0,0,w,0],'nuv':[0,0,1,0,0,1,1,1],
      'minPos':[-w/2,-h/2,0],'maxPos':[w/2,h/2,0]}
    data['userData']['hasAlpha']='A' in image.getbands()
    meta.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print(path.name,w,h,new)
