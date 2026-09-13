const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../integration/cyberbiz-cart-route-diagnostic-20260913.js'),'utf8');
function boot(href, final='https://www.eyefans.com.tw/account', fail=false){
  const nodes=[], requests=[];
  function node(tag){const n={tag,style:{},children:[],append(...v){this.children.push(...v)},setAttribute(){},addEventListener(event,fn){this[event]=fn}};nodes.push(n);return n;}
  const document={readyState:'complete',getElementById(){return null},createElement:node,body:{prepend(){}}};
  const window={location:{href},navigator:{userAgent:'Line/15'},setTimeout,clearTimeout,async fetch(url,options){
    requests.push({url,options});
    if(fail)throw Error('private detail must not be shown');
    return {ok:true,status:200,url:final,redirected:true,type:'basic',headers:{get(){return 'application/json'}},async json(){return {items:[],item_count:0,private:'secret'}},body:{cancel(){return Promise.resolve()}}};
  }};
  vm.runInNewContext(source,{window,document,URL,AbortController});
  return {nodes,requests};
}
const product='https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd';
test('inert on normal pages, wrong origin, wrong product or nonexact gate',()=>{
  for(const url of [product,product+'?eyefans_cart_diagnostic=true',product.replace('www.eyefans.com.tw','example.com')+'?eyefans_cart_diagnostic=1','https://www.eyefans.com.tw/cart?eyefans_cart_diagnostic=1'])assert.equal(boot(url).nodes.length,0);
});
test('explicit button sends only two GETs and displays route, not payload',async()=>{
  const e=boot(product+'?eyefans_cart_diagnostic=1');
  assert.equal(e.requests.length,0);
  await e.nodes.find(n=>n.tag==='button').click();
  assert.equal(e.requests.length,2);
  for(const r of e.requests)assert.equal(r.options.method,'GET');
  const text=e.nodes.find(n=>n.tag==='pre').textContent;
  assert.match(text,/最終路徑：\/account/);
  assert.doesNotMatch(text,/secret|private/);
});
test('redacts cart token query and foreign destination',async()=>{
  for(const url of ['https://www.eyefans.com.tw/carts/secret-token?email=private@example.com','https://other.test/private']){
    const e=boot(product+'?eyefans_cart_diagnostic=1',url);
    await e.nodes.find(n=>n.tag==='button').click();
    assert.doesNotMatch(e.nodes.find(n=>n.tag==='pre').textContent,/secret-token|email=|private|other.test/);
  }
});
test('read failure restores button without exposing exception content',async()=>{
  const e=boot(product+'?eyefans_cart_diagnostic=1',undefined,true);
  const b=e.nodes.find(n=>n.tag==='button');await b.click();assert.equal(b.disabled,false);
  assert.match(e.nodes.find(n=>n.tag==='pre').textContent,/讀取失敗/);
  assert.doesNotMatch(e.nodes.find(n=>n.tag==='pre').textContent,/private/);
});
