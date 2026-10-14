const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('All 56 catalog and print images load from identical embedded SVG bytes', () => {
 const app=fs.readFileSync('app.js','utf8'), html=fs.readFileSync('index.html','utf8');
 const bundle=JSON.parse(html.match(/<script type="application\/json" id="inline-photo-assets">([^]*?)<\/script>/)[1]);
 const buttons=[], slots={};
 const context={INLINE_PHOTO_ASSETS:bundle,UV_ICON_COUNT:56,XLINK_NS:'http://www.w3.org/1999/xlink',state:{activeIconSlot:'icon1'},
 document:{getElementById:id=>id==='icon-catalog'?{appendChild:f=>buttons.push(...f.children)}:{textContent:''},
 createDocumentFragment:()=>({children:[],appendChild(x){this.children.push(x);}}),createElement:()=>({dataset:{},setAttribute(){},addEventListener(){}})}};
 vm.createContext(context);
 for(const name of ['uvIconAsset','setSvgHref','renderIconCatalog'])vm.runInContext(app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0],context);
 context.renderIconCatalog();
 assert.equal(buttons.length,56);
 for(let n=1;n<=56;n++) {
  const id=String(n).padStart(2,'0'), path=context.uvIconAsset(id), uri=bundle[path];
  assert.ok(uri.startsWith('data:image/svg+xml;base64,'));
  assert.deepEqual(Buffer.from(uri.split(',')[1],'base64'),fs.readFileSync(path));
  assert.ok(buttons[n-1].innerHTML.includes(uri));
  const attributes={};context.setSvgHref({setAttribute:(k,v)=>attributes[k]=v,setAttributeNS:(ns,k,v)=>attributes[k]=v},path);
  assert.equal(attributes.href,uri); assert.equal(attributes['xlink:href'],uri);
 }
 assert.match(app,/slot}-preview`\)\.src = INLINE_PHOTO_ASSETS/);
});
