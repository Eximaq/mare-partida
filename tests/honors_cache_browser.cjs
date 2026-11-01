'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
(async()=>{const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
for(const f of ['achievement-ui.js','honors-hd.css','hierarchy-ui.js','hierarchy-system.js','character-hud.js','ui-hud.css','talent-ui.js','game.js']){
 const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist',f))).digest('hex').slice(0,16);
 assert(html.includes(f+'?v='+digest),f+' must use the current build hash');
}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const ctx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[],stale=[];p.on('pageerror',e=>errors.push(e.message));
for(const f of ['game.js','achievement-ui.js','honors-hd.css'])await p.route('**/'+f,r=>{stale.push(f);return r.fulfill({contentType:f.endsWith('.css')?'text/css':'application/javascript',body:f.endsWith('.css')?'body{display:none}':'throw Error("obsolete resource")'});});
await p.goto(process.env.MARE_TEST_URL);await p.locator('#characterName').fill('QA Publicado');await p.locator('#nextToClass').tap();await p.locator('#nextToAppearance').tap();await p.locator('#createCharacter').tap();await p.locator('[data-confirm-accept]').tap();await p.waitForFunction(()=>window.__mareDiagnostics&&__mareDiagnostics().lobby96.state==='ready');
await p.locator('#characterMenuTrigger').tap();await p.locator('[data-character-section=achievements]').tap();assert(await p.locator('.achievement-journal').isVisible());assert.equal(await p.locator('[data-achievement-points]').textContent(),'0 PT');
await p.locator('[data-achievement-category=kills]').tap();assert.equal(await p.locator('[data-achievement-category=kills]').getAttribute('aria-pressed'),'true');
await p.locator('#closePanel').tap();await p.locator('#characterMenuTrigger').tap();await p.locator('[data-character-section=hierarchy]').tap();
await p.locator('[data-hierarchy-faction=marine]').tap();assert((await p.locator('.hierarchy-intro h2').textContent()).includes('Marinha'));await p.locator('[data-hierarchy-tier-select]').selectOption('8');assert((await p.locator('.hierarchy-title-pair').textContent()).includes('Almirante de Frota'));
assert.equal(await p.evaluate(()=>typeof window.__honorsQA),'undefined'); // No test-only gameplay globals are injected.
assert.deepEqual(stale,[]);assert.deepEqual(errors,[]);console.log('Public dist: current hashes, stale unversioned resources bypassed, both real menus, mobile touch and reduced motion passed.');}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
