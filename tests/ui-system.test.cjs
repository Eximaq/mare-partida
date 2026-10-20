'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ui=require('../ui-system.js');
const button=ui.button({label:'<script>x</script>',attributes:{'data-panel':'help',onclick:'bad()','aria-label':'"help"'}});
assert.ok(button.includes('&lt;script&gt;'));assert.ok(!button.includes('onclick='));assert.ok(button.includes('aria-label="&quot;help&quot;"'));
assert.ok(ui.notice({text:'<img>',tone:'error'}).includes('role="alert"'));
assert.ok(ui.empty({title:'Aguarde',description:'<x>'}).includes('&lt;x&gt;'));
assert.ok(ui.slot({label:'Item',image:'x" onerror="alert(1)'}).includes('&quot;'));
assert.ok(ui.window({id:'test',title:'Teste'}).includes('aria-labelledby="test-title"'));
assert.ok(ui.confirmation({title:'Confirma?',message:'<x>',acceptLabel:'Vender',cancelLabel:'Cancelar',danger:true}).includes('data-variant="danger"'));
assert.ok(ui.tabs({label:'Seções',selected:'a',items:[{id:'a',label:'A'},{id:'b',label:'B'}]}).includes('aria-pressed="true"'));
const root=path.resolve(__dirname,'..');
for(const file of ['styles.css','ui-nautical.css','character-menu.css','inventory-compact.css','modes-menu.css','audio-system.css']){
 const css=fs.readFileSync(path.join(root,file),'utf8');assert.ok(css.includes('@layer legacy-priority'));assert.ok(!css.includes('!important'),file);
}
assert.ok(!/localStorage|sessionStorage|MareHaki\.|MareCharacters\.|MareForge\./.test(fs.readFileSync(path.join(root,'ui-system.js'),'utf8')));
console.log('UI primitives escape text/attributes, share accessible structures and contain legacy priority without gameplay/storage dependencies.');
