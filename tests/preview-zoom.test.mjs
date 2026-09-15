import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function element() {
  const handlers={},values={},classes=new Set(),captures=new Set();
  return {handlers,values,disabled:false,textContent:'',
    style:{setProperty:(k,v)=>values[k]=v},
    classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k)},
    addEventListener:(type,fn)=>(handlers[type]??=[]).push(fn),
    getBoundingClientRect:()=>({left:0,top:0,width:500,height:500}),
    setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),
    closest:()=>null,
    fire(type,args={}){for(const fn of handlers[type]||[])fn({target:this,preventDefault(){},...args});}
  };
}
const ids=Object.fromEntries(['viewer','preview-zoom-controls','preview-zoom-value','view-tabs','render-mode-options'].map(id=>[id,element()]));
const buttons={in:element(),out:element(),reset:element()};
ids['preview-zoom-controls'].querySelector=selector=>buttons[selector.match(/"(.*?)"/)[1]];
const context=vm.createContext({document:{getElementById:id=>ids[id]},window:{addEventListener(){}},ResizeObserver:class{observe(){}}});
vm.runInContext(readFileSync(process.argv[2] || 'preview-zoom.js','utf8'),context);
const viewer=ids.viewer,read=()=>({s:viewer.values['--preview-scale'],x:parseFloat(viewer.values['--preview-x']),y:parseFloat(viewer.values['--preview-y'])});
assert.equal(read().s,1);assert.equal(buttons.out.disabled,true);
for(let i=0;i<12;i++)buttons.in.fire('click');
assert.equal(read().s,3);assert.equal(buttons.in.disabled,true);
viewer.fire('pointerdown',{pointerId:1,pointerType:'mouse',button:0,clientX:250,clientY:250});
viewer.fire('pointermove',{pointerId:1,clientX:350,clientY:300});
assert.equal(read().x,100);assert.equal(read().y,50);
viewer.fire('pointerup',{pointerId:1});
buttons.reset.fire('click');assert.deepEqual(read(),{s:1,x:0,y:0});
viewer.fire('pointerdown',{pointerId:1,pointerType:'touch',clientX:200,clientY:250});
viewer.fire('pointerdown',{pointerId:2,pointerType:'touch',clientX:300,clientY:250});
viewer.fire('pointermove',{pointerId:2,clientX:400,clientY:250});
assert.equal(read().s,2);assert.equal(read().x,50);
viewer.fire('pointercancel',{pointerId:2});viewer.fire('pointerup',{pointerId:1});
viewer.fire('keydown',{key:'ArrowLeft'});assert.equal(read().x,20);
viewer.fire('keydown',{key:'0'});assert.deepEqual(read(),{s:1,x:0,y:0});
buttons.in.fire('click');ids['view-tabs'].fire('click',{target:{closest:()=>({disabled:false})}});
assert.equal(read().s,1);
for(let i=0;i<5;i++)buttons.out.fire('click');assert.equal(read().s,1);
console.log('PASS: 100–300% limits, pan, reset, two-pointer pinch, cancellation, keyboard and angle-change reset.');
