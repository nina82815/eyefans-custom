const test=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs');
const sharp=require('sharp');
test('Startup has no external stylesheet/script dependency and stays below 3.3 MB',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.doesNotMatch(html,/<link[^>]+rel="stylesheet"/);
 assert.doesNotMatch(html,/<script[^>]+src=/);
 assert.ok(Buffer.byteLength(html)<3300000);
 assert.match(html,/font-family: "eYeFans GenSen Rounded UI"/);
 assert.match(html,/font-family: "eYeFans Tsuhsian UI"/);
 assert.match(html,/data:font\/woff2;base64,/);
 for(const [id,file] of [['inline-preview-zoom-js','preview-zoom.js'],['inline-mobile-studio-js','mobile-studio.js']])
  assert.ok(html.includes(`<script id="${id}">${fs.readFileSync(file,'utf8')}</script>`));
});
test('Lossless startup images retain dimensions and visible pixels for all 56 icons and photo layers',async()=>{
 const bundle=JSON.parse(fs.readFileSync('assets/startup-previews.json','utf8'));
 assert.equal(Object.keys(bundle).filter(p=>p.startsWith('assets/uv-icons/')).length,56);
 for(const [key,uri] of Object.entries(bundle)) {
  const file=key.startsWith('assets/uv-icons/')?key.replace('uv-icons/','uv-icons/preview/').replace('.svg','.png'):key;
  const display=Buffer.from(uri.split(',')[1],'base64');
  const original=await sharp(file).flatten({background:'#ffffff'}).raw().toBuffer({resolveWithObject:true});
  const packed=await sharp(display).flatten({background:'#ffffff'}).raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(packed.info,original.info,key+' dimensions');
  assert.deepEqual(packed.data,original.data,key+' visible pixels');
 }
});
