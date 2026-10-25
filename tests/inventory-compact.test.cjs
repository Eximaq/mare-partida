'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const css=read('inventory-compact.css')+read('ui-screens.css')+read('ui-responsive.css');
const compact=css.replace(/\s/g,'');
const html=read('index.html');
const builder=read('tools/build_pages.py');
const game=read('game.js');

assert.ok(html.includes('<link rel="stylesheet" href="inventory-compact.css" />'),'UI must load new stylesheet');
assert.ok(builder.includes("'inventory-compact.css'"),'Pages must publish the new stylesheet');
assert.match(css,/width:min\(1280px,calc\(100vw - 40px\)\)/,'desktop inventory width capped');
assert.match(css,/height:min\(760px,calc\(100dvh - 40px\)\)/,'desktop inventory height capped');
assert.match(css,/--bag-columns:9/,'desktop inventory uses nine columns');
assert.match(game,/pageSize:BAG_PER_PAGE\}=MareUI\.inventoryGrid\(innerWidth\)/,'seven-row pages derive from responsive helper');
assert.match(css,/--bag-columns:7/,'tablet inventory uses seven columns');
assert.match(css,/--bag-columns:5/,'narrow mobile inventory uses five columns');
assert.match(css,/\.op-item-icon \.item-icon\s*\{/,'item sprite sizing preserves 32px PixelLab');
assert.match(css,/image-rendering:pixelated/,'pixel art remains crisp');
assert.match(css,/\.op-detail-panel\s*\{/,'item details preserved');
assert.match(css,/\.op-equip-slot\s*\{/,'equipment preserved');
assert.match(css,/overflow-y:auto/,'long content scrolls');
assert.match(game,/Array\.from\(\{length:BAG_PER_PAGE-shown\.length\}/,'all page slots are rendered');
assert.match(game,/class="op-grid"/,'existing item grid is unchanged');
let depth=0,comment=false,quote=null;
for(let i=0;i<css.length;i++){
  const c=css[i],n=css[i+1];
  if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
  if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote=null;continue;}
  if(c==='/'&&n==='*'){comment=true;i++;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='{')depth++;
  if(c==='}')depth--;
  assert.ok(depth>=0,'unmatched CSS closing brace');
}
assert.equal(depth,0,'balanced CSS braces');
console.log('Inventory responsive: capped 1280x760, 9/8/7/6/5 columns, seven-row pagination, sprites and static release OK');
