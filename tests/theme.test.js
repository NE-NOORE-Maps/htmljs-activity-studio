import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
for(const [saved,expected] of [['dark','dark'],['light','light'],['invalid','light'],[null,'light']]) {
 test(`initial theme handles ${saved}`,()=>{
  const attrs={};
  vm.runInNewContext(readFileSync(new URL('../js/theme-init.js',import.meta.url),'utf8'),{document:{documentElement:{setAttribute:(k,v)=>attrs[k]=v}},localStorage:{getItem:()=>saved}});
  assert.equal(attrs['data-theme'],expected);
 });
}
test('theme initialization tolerates blocked storage',()=>{
 const attrs={};
 vm.runInNewContext(readFileSync(new URL('../js/theme-init.js',import.meta.url),'utf8'),{document:{documentElement:{setAttribute:(k,v)=>attrs[k]=v}},localStorage:{getItem:()=>{throw Error('blocked');}}});
 assert.equal(attrs['data-theme'],'light');
});

test('dark text tokens remain readable on all dark surfaces',()=>{
 const css=readFileSync(new URL('../css/studio-pro.css',import.meta.url),'utf8');
 const block=css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/)[1];
 const tokens=Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)].map(m=>[m[1],m[2]]));
 const luminance=hex=>{
  const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;
 };
 for(const fg of ['--text-primary','--text-secondary','--text-muted','--primary-700'])
  for(const bg of ['--bg-main','--bg-surface','--bg-subtle']) {
   const a=luminance(tokens[fg]),b=luminance(tokens[bg]);
   assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5,`${fg} on ${bg}`);
  }
});
