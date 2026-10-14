const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('Print detail follows live artwork, slider and Escape, and restores overview on mode changes', () => {
  function node() {return {dataset:{},values:{},handlers:{},hidden:false,value:'100',textContent:'',
    style:{setProperty(k,v){this.owner.values[k]=v;}},classList:{toggle(){}},
    setAttribute(k,v){this[k]=v;},addEventListener(k,v){this.handlers[k]=v;},
    fire(k,e={}){this.handlers[k]?.({target:this,preventDefault(){},...e});}};}
  const ids={}; for (const id of ['viewer','preview-print-detail','print-detail-slider','print-detail-range','print-detail-percent','view-tabs','render-mode-options']) { ids[id]=node(); ids[id].style.owner=ids[id]; }
  const viewer=ids.viewer, rect={left:0,top:0,width:600,height:400};
  viewer.getBoundingClientRect=()=>rect;
  let printWidth=100, mutation;
  const content={getBoundingClientRect:()=>({left:350,top:100,width:printWidth,height:20}),closest:()=>({getBoundingClientRect:()=>rect})};
  viewer.querySelectorAll=()=>[content];
  const reset={click(){viewer.values['--preview-scale']='1';viewer.values['--preview-x']='0px';viewer.values['--preview-y']='0px';}};
  const document={getElementById:id=>ids[id],querySelector:s=>s.includes('reset')?reset:null,fonts:{addEventListener(){}}};
  const context={document,getComputedStyle:()=>({display:'inline'}),MutationObserver:class{constructor(cb){mutation=cb;}observe(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:cb=>{cb();return 0;}};
  vm.runInNewContext(fs.readFileSync('print-detail.js','utf8'),context);
  const button=ids['preview-print-detail'];
  assert.equal(button.textContent,'放大預覽印刷'); button.fire('click');
  assert.equal(viewer.dataset.printDetail,'true'); assert.equal(ids['print-detail-slider'].hidden,false);
  assert.equal(Number(viewer.values['--preview-scale']),4.68); assert.equal(Number.parseFloat(viewer.values['--preview-x']),-468);
  printWidth=200; mutation([{type:'childList'}]); assert.equal(Number(viewer.values['--preview-scale']),2.34);
  ids['print-detail-range'].value='200'; ids['print-detail-range'].fire('input');
  assert.equal(Number(viewer.values['--preview-scale']),4.68); assert.equal(ids['print-detail-percent'].textContent,'200%');
  viewer.fire('keydown',{key:'Escape'});
  assert.equal(viewer.dataset.printDetail,'false'); assert.equal(viewer.values['--preview-scale'],'1');
  assert.equal(ids['print-detail-slider'].hidden,true); assert.equal(ids['print-detail-range'].value,'100');
  button.fire('click'); ids['render-mode-options'].fire('click',{target:{closest:()=>({})}});
  assert.equal(viewer.values['--preview-scale'],'1'); assert.equal(viewer.dataset.printDetail,'false');
  assert.ok(fs.readFileSync('index.html','utf8').includes('<script id="print-detail-app">'+fs.readFileSync('print-detail.js','utf8')+'</script>'));
});
