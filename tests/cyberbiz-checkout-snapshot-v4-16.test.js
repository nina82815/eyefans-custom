const assert=require('node:assert/strict');
process.env.EYEFANS_NOTE_SYNC_LOADER='cyberbiz-cart-production-loader-20260915-all-combined-v4-16.js';
process.env.EYEFANS_NOTE_SYNC_VARIANT_ID_FORMAT='numeric-string';
const {createEnvironment,activeRecord,cartItem,flushMicrotasks}=require('./helpers-checkout-final-payload.cjs');
async function settle(e){await flushMicrotasks();for(let i=0;i<20;i++){const d=e.pendingDelays().find(d=>d!==5000);if(d===undefined)break;e.runTimer(d);await flushMicrotasks();}}
const r=activeRecord({requestId:'audit-request-001',designId:'EF-AUDIT1-TEST01',lensId:'gray',frame:'櫻花粉',before:0,after:1});
const other=activeRecord({requestId:'audit-request-002',designId:'EF-AUDIT2-TEST02',lensId:'blue-tea',frame:'櫻花粉',before:0,after:1});
other.targetHandle='cls-cus-mix-sun-rd';other.targetProductId='71536660';other.variantId='87870153';other.receipt.variantId='87870153';other.receipt.cartItemId='87870153_normal_';
const opts={productionRuntime:true,initialItemsOverride:[cartItem(r.variantId,1)]};
(async()=>{
 const pending={...other,status:'pending',cartToken:null,createdAt:Date.now()-360000};delete pending.receipt;
 const e=createEnvironment([r,pending],opts);await settle(e);assert.equal(e.attemptPost('order%5Bnote%5D=').aborted,false);assert.match(e.note.value,/EF-AUDIT1/);assert.doesNotMatch(e.note.value,/EF-AUDIT2/);
 assert.match(e.window.localStorage.getItem('eyefansCustomCartDesignsProdV1'),/EF-AUDIT2/,'history retained');
 const recent=createEnvironment([r,{...pending,createdAt:Date.now()-1000}],opts);await settle(recent);assert.equal(recent.attemptPost('order%5Bnote%5D=').aborted,true,'in-flight absent add stays guarded');
 const needs={...r,status:'pending',cartToken:null};delete needs.receipt;
 const deleted=createEnvironment([needs,other],opts);await settle(deleted);assert.ok(deleted.document.getElementById('eyefans-cart-design-summary').children.find(c=>c.id==='eyefans-confirm-pending-designs'));
 const stale=createEnvironment([r],opts);const query=stale.document.querySelector.bind(stale.document);stale.document.querySelector=s=>s==='#order_payment_service'?{value:'cyberbizpay_applepay'}:query(s);await settle(stale);
 const replacement=activeRecord({requestId:'audit-request-003',designId:'EF-AUDIT3-TEST03',lensId:'gray',frame:'櫻花粉',before:0,after:1});
 stale.window.localStorage.setItem('eyefansCustomCartDesignsProdV1',JSON.stringify([replacement]));
 assert.equal(stale.attemptPost('order%5Bnote%5D=').aborted,true,'final guard rejects cached storage');
 assert.equal(stale.triggerCheckoutClick(),true,'Apple Pay first gesture resyncs');await settle(stale);
 assert.equal(stale.triggerCheckoutClick(),false,'next real gesture passes');assert.equal(stale.checkout.clickCount,0);
 const sent=stale.attemptPost('order%5Bnote%5D=');assert.equal(sent.aborted,false);assert.match(new URLSearchParams(sent.options.data).get('order[note]'),/EF-AUDIT3/);
 stale.window.localStorage.setItem('eyefansCustomCartDesignsProdV1','bad json');assert.equal(stale.attemptPost('order%5Bnote%5D=').aborted,true);
 console.log('PASS stale Apple Pay/final note blocked; fresh design used; removed-history recovery; old absent pending ignored without deletion; recent pending and corrupt storage blocked');
})().catch(e=>{console.error(e);process.exitCode=1;});
