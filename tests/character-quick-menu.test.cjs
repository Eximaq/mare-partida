'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const index = read('index.html');
const source = read('game.js');
const css = read('character-menu.css');
const build = read('tools/build_pages.py');
new vm.Script(source, { filename:'game.js' });
const sections = ['status','talents','achievements','haki','akuma','hierarchy'];
assert.match(index,/id="characterMenuTrigger"[^>]*aria-expanded="false"/);
assert.doesNotMatch(index,/id="characterMenuBrowse"/,'the icon is the only character menu trigger');
assert.match(index,/id="characterQuickMenu"[^>]*class="character-quick-menu hidden"/);
for (const id of sections) assert.match(index,new RegExp('data-character-section="'+id+'"'),id+' has direct shortcut');
assert.equal((index.match(/data-character-section="/g)||[]).length,6,'exactly six character menu entries');
assert.doesNotMatch(source,/insertAdjacentHTML\('afterend',`<nav class="character-tabs"/,'old tab bar no longer injected');
assert.doesNotMatch(source,/body\.innerHTML=`<section class="character-choice"/,'intermediate hub removed');
assert.match(source,/function openPanel\(panel,characterSection=null\)/);
assert.match(source,/openPanel\('character',section\.dataset\.characterSection\)/);
assert.match(source,/if\(k==='p'\)\{if\(!currentPanel\)toggleCharacterMenu\(\)/);
assert.match(source,/\['ArrowUp','ArrowDown','Home','End'\]/);
assert.match(source,/if\(!\$\('characterQuickMenu'\)\.classList\.contains\('hidden'\)\)/);
assert.match(css,/#mainMenu \[data-panel\]/);
assert.match(css,/#mainMenu \.character-quick-menu/);
assert.ok(build.includes("'character-menu.css'"),'Pages builder publishes character menu styles');
assert.ok(index.includes('href="character-menu.css"'),'Browser loads menu stylesheet');
// Execute the real controller: pending badges must never bypass the dropdown.
for(const pending of [0,4]){
  const classes=new Set(['hidden']),attributes={};let focused=0;
  const trigger={setAttribute:(k,v)=>attributes[k]=v,focus:()=>focused++};
  const menu={classList:{contains:k=>classes.has(k),toggle:(k,on)=>on?classes.add(k):classes.delete(k)},
    querySelector:()=>({focus:()=>focused++,classList:{toggle:()=>{}}})};
  const context={game:{},notificationManager:{state:{character:pending},focus:()=>{throw Error('Badge bypassed the menu')}},
    updateNotifications:()=>{},closeModesMenu:()=>{},closeCaptainMenu:()=>{},
    document:{querySelector:()=>null},$:id=>({characterQuickMenu:menu,characterMenuTrigger:trigger,
      panelOverlay:{classList:{contains:()=>true}},characterMenuHakiHint:{}}[id])};
  vm.createContext(context);vm.runInContext(source.match(/  function toggleCharacterMenu\([^]*?\n  }/)[0],context);
  context.toggleCharacterMenu();assert.equal(classes.has('hidden'),false);
  assert.equal(attributes['aria-expanded'],'true');assert.equal(focused,1);
  context.toggleCharacterMenu();assert.equal(classes.has('hidden'),true);
  assert.equal(attributes['aria-expanded'],'false');assert.equal(focused,2);
}
console.log('Character navigation: 6 direct entries, keyboard, no intermediate screen, stylesheet and build verified.');
