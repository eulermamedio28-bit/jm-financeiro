from pathlib import Path
from PIL import Image
from io import BytesIO
import cairosvg
source=Image.open(BytesIO(cairosvg.svg2png(url='brand/elm-mark.svg',output_width=1024,output_height=1024))).convert('RGBA')
res=Path('android/app/src/main/res')
for folder,size in {'mipmap-mdpi':48,'mipmap-hdpi':72,'mipmap-xhdpi':96,'mipmap-xxhdpi':144,'mipmap-xxxhdpi':192}.items():
    target=res/folder
    target.mkdir(parents=True,exist_ok=True)
    icon=source.resize((size,size),Image.Resampling.LANCZOS)
    for name in ('ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png'):
        icon.save(target/name)
for folder in res.glob('mipmap-*'):
    for name in ('ic_launcher.webp','ic_launcher_round.webp','ic_launcher_foreground.webp'):
        (folder/name).unlink(missing_ok=True)
