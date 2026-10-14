// Run with Node.js and sharp available (npm install --no-save sharp).
// Display-only PNGs keep SVG source artwork and manufacturing IDs unchanged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
(async () => {
 const destination = path.join(root, 'assets/uv-icons/preview');
 fs.mkdirSync(destination, {recursive:true});
 const manifest = {};
 for (let n=1;n<=56;n++) {
  const name = n===44 ? '44-v3' : String(n).padStart(2,'0');
  const source = fs.readFileSync(path.join(root, `assets/uv-icons/${name}.svg`));
  const png = await sharp(source, {density:600}).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  fs.writeFileSync(path.join(destination, `${name}.png`),png);
  manifest[name] = {sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),pngSha256:crypto.createHash('sha256').update(png).digest('hex')};
 }
 fs.writeFileSync(path.join(destination,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
})();
