// Build lossless display previews; original artwork and manufacturing IDs are unchanged.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
(async () => {
  const files = fs.readdirSync(path.join(root,'assets/photos/right-a45/normalized/masks/standard'))
    .filter(name => name.endsWith('.png')).map(name => [`assets/photos/right-a45/normalized/masks/standard/${name}`, `assets/photos/right-a45/normalized/masks/standard/${name}`]);
  files.push(['assets/photos/right-a45/normalized/gray/sakura-pink.png','assets/photos/right-a45/normalized/gray/sakura-pink.png']);
  for(let n=1;n<=56;n++) {
    const name=n===44?'44-v3':String(n).padStart(2,'0');
    files.push([`assets/uv-icons/${name}.svg`,`assets/uv-icons/preview/${name}.png`]);
  }
  const bundle={};
  for(const [key,file] of files) {
    const bytes=await sharp(path.join(root,file)).webp({lossless:true,effort:6}).toBuffer();
    bundle[key]='data:image/webp;base64,'+bytes.toString('base64');
  }
  fs.writeFileSync(path.join(root,'assets/startup-previews.json'),JSON.stringify(bundle));
})();
