const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('mobile 2D camera removes export whitespace and restores desktop viewBox', () => {
  let box = '0 0 558.55 558.55', onChange;
  const media = {matches:true,addEventListener:(n,fn)=>onChange=fn};
  const svg = {parentElement:{hidden:false},getAttribute:()=>box,setAttribute:(n,v)=>box=v,getBBox:()=>({x:60,y:180,width:430,height:170})};
  const viewer = {querySelectorAll:()=>[svg],classList:{contains:()=>false}};
  const document = {getElementById:()=>viewer,addEventListener(){}};
  vm.runInNewContext(read('mobile-studio.js'),{document,matchMedia:()=>media,WeakMap,requestAnimationFrame:fn=>fn(),MutationObserver:class{observe(){}}});
  const fitted = box.split(' ').map(Number);
  assert.ok(fitted[0]<60 && fitted[1]<180);
  assert.ok(fitted[2]>430 && fitted[3]>170 && fitted[3]<220);
  media.matches=false; onChange(); assert.equal(box,'0 0 558.55 558.55');
});
test('typing layout follows focus without touching design state', () => {
  const events = {}, classes = new Set();
  const document = {getElementById:()=>null,activeElement:{matches:()=>true}, body:{classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c)}},addEventListener:(n,fn)=>events[n]=fn};
  vm.runInNewContext(read('mobile-studio.js'),{document,requestAnimationFrame:fn=>fn()});
  events.focusin(); assert.ok(classes.has('mobile-studio-typing'));
  document.activeElement = null; events.focusout(); assert.equal(classes.size,0);
});
test('host expands in place, closes and restores overflow; installation is idempotent', () => {
  const elements = [], events = {}, classes = new Set();
  const frame = {src:'unchanged-design-frame'};
  const wrap = {dataset:{},querySelector:()=>frame,before:e=>elements.push(e),append:e=>elements.push(e),classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
  let mutation, resize;
  const document = {head:{append(){}},body:{style:{overflow:'auto'}},querySelectorAll:()=>[wrap],addEventListener:(n,fn)=>events[n]=fn,createElement:()=>({attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(n,fn){this.events[n]=fn},focus(){}})};
  vm.runInNewContext(read('integration/mobile-studio-host.js'),{document,MutationObserver:class{constructor(fn){mutation=fn}observe(){}},matchMedia:()=>({addEventListener:(n,fn)=>resize=fn})});
  assert.equal(elements.length,2); mutation(); assert.equal(elements.length,2);
  const [open,close]=elements;
  open.events.click(); assert.ok(classes.has('eyefans-studio-expanded')); assert.equal(document.body.style.overflow,'hidden');
  open.events.click(); close.events.click(); assert.equal(document.body.style.overflow,'auto'); assert.equal(frame.src,'unchanged-design-frame');
  open.events.click(); events.keydown({key:'Escape'}); assert.equal(classes.size,0);
  open.events.click(); resize({matches:false}); assert.equal(classes.size,0); assert.equal(document.body.style.overflow,'auto');
});
