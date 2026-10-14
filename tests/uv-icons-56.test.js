'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const bridgeFile = 'cyberbiz-cart-production-loader-20261014-all-combined-v4-22.js';
const bridge = fs.readFileSync(path.join(root,'integration',bridgeFile),'utf8');
assert.match(bridge, /CUSTOMIZER_UI_VERSION = "20261014-png1-fast1"/, 'storefront must bypass pre-P1 iframe caches');
function fn(source,name,indent='') {
  const match=source.match(new RegExp(`${indent}function ${name}\\([^]*?\\n${indent}\\}`));
  assert.ok(match,name); return match[0];
}
const buttons=[];
const mount={appendChild(fragment){buttons.push(...fragment.children);}};
const label={textContent:''};
const sandbox={INLINE_PHOTO_ASSETS:{},UV_ICON_COUNT:56,state:{activeIconSlot:'icon1',icon1:'01',icon2:'04'},
  document:{getElementById:id=>id==='icon-catalog'?mount:label,
    createDocumentFragment:()=>({children:[],appendChild(el){this.children.push(el);}}),
    createElement:()=>({dataset:{},setAttribute(){},addEventListener(event,handler){this.click=handler;}})},
  updateIconSlotUi(){},updateAll(){}};
vm.createContext(sandbox);
vm.runInContext(['uvIconAsset','chooseIcon','renderIconCatalog'].map(name=>fn(app,name)).join('\n'),sandbox);
sandbox.renderIconCatalog();
assert.equal(buttons.length,56);assert.match(label.textContent,/56/);
assert.equal(new Set(buttons.map(b=>b.dataset.icon)).size,56);
assert.match(html,/圖案目錄，共 56 款/);
for(let n=1;n<=56;n++) {
  const id=String(n).padStart(2,'0');
  const asset=sandbox.uvIconAsset(id).split('?')[0];
  const svg=fs.readFileSync(path.join(root,asset),'utf8');
  assert.match(svg,/<svg\b/); assert.match(svg,/viewBox=/);
  assert.doesNotMatch(svg,/<(?:script|foreignObject|image)\b|\bon\w+\s*=/i);
  buttons[n-1].click();assert.equal(sandbox.state.icon1,id);
  assert.notEqual(sandbox.state.icon1,sandbox.state.icon2);
}
assert.match(sandbox.uvIconAsset('44'),/44-v3\.svg/);
const selection={customizationMode:'uv',size:'M',frame:'櫻花粉',temple:'櫻花粉',lensId:'gray',
  printMode:'both',uvPrintMode:'both',icon1:'34',icon2:'56',name:'eyefans',textColor:'white',
  font:'baksoSapi',caseMode:'preserve',order:'normal',namePosition:'center',
  customizationSide:'right',customizationSideLabel:'右外側鏡腳'};
const validator={ALLOWED_ORDERS:new Set(['normal','reverse']),ALLOWED_TEXT_COLORS:new Set(['black','white','rainbow']),
  ALLOWED_FONTS:new Set(['baksoSapi','purpleSmile','zhBold','zhRounded']),ALLOWED_CASES:new Set(['preserve']),
  ALLOWED_NAME_POSITIONS:new Set(['center','before','after']),ENGLISH_FONTS:new Set(['baksoSapi','purpleSmile'])};
vm.createContext(validator);
vm.runInContext(fn(bridge,'uvNameUnits','  ')+'\n'+fn(bridge,'validateModeSelection','  '),validator);
for(let n=1;n<=56;n++)assert.doesNotThrow(()=>validator.validateModeSelection({...selection,icon1:String(n).padStart(2,'0')},'uv'));
for(const id of ['00','57','99','abc','1'])assert.throws(()=>validator.validateModeSelection({...selection,icon1:id},'uv'),/INVALID_UV_ICONS/);
process.env.EYEFANS_NOTE_SYNC_LOADER=bridgeFile;
process.env.EYEFANS_NOTE_SYNC_VARIANT_ID_FORMAT='numeric-string';
const {createEnvironment,activeRecord,fingerprintFor,cartItem,flushMicrotasks}=require('./helpers-checkout-final-payload.cjs');
(async()=>{
  const r=activeRecord({requestId:'icons56-test',designId:'EF-ICONS56-TEST01',lensId:'gray',frame:'櫻花粉',before:0,after:1});
  Object.assign(r,{mode:'uv',handle:'cls-cus-mix-uv-sun-rd',targetHandle:'cls-cus-mix-uv-sun-rd',targetProductId:'71536673',variantId:'87817316',selection});
  r.fingerprint=fingerprintFor(r.handle,selection);
  Object.assign(r.receipt,{variantId:r.variantId,cartItemId:r.variantId+'_normal_'});
  const e=createEnvironment([r],{productionRuntime:true,initialItemsOverride:[cartItem(r.variantId,1)]});
  await flushMicrotasks();
  for(let i=0;i<20;i++){const delay=e.pendingDelays().find(d=>d!==5000);if(delay===undefined)break;e.runTimer(delay);await flushMicrotasks();}
  assert.match(e.note.value,/圖案：34／56/,'new IDs survive cart note serialization');
  const sent=e.attemptPost('order%5Bnote%5D=');
  assert.equal(sent.aborted,false);
  assert.match(new URLSearchParams(sent.options.data).get('order[note]'),/圖案：34／56/,'new IDs survive final checkout note');
  console.log('56 assets, selection swapping, cart validation and checkout note tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
