from pathlib import Path
from shutil import copytree
res=Path('android/app/src/main/res')
copytree('brand/android-res',res,dirs_exist_ok=True)
for folder in res.glob('mipmap-*'):
 for name in ('ic_launcher.webp','ic_launcher_round.webp','ic_launcher_foreground.webp'):
  (folder/name).unlink(missing_ok=True)
