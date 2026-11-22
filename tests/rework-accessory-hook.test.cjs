const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'../tools/rework-accessories'),manifest=require(base+'/manifest.json');
const pilot=require('../player-rework-accessory-pilot.js'),vendor=require('../tools/rework-accessories/vendor.js');
const catalogs=Object.fromEntries(Object.keys(pilot.PACKAGE_TYPES).map(p=>[p,require(base+'/'+p+'/catalog.json')]));
function scope(){const notices=[],urls=[],nodes={};const s={performance,AbortController,MareHeadgear:require('../headgear-visibility.js'),URL,URLSearchParams,console:{error(){}},MareReworkAccessoryPilot:pilot,ReworkAccessoryVendor:vendor,document:{body:{appendChild(n){nodes[n.id]=n;}},getElementById:id=>nodes[id],createElement:()=>({style:{},setAttribute(){},set textContent(v){notices.push(v)}})},fetch:async url=>{urls.push(String(url));const pkg=Object.keys(catalogs).find(p=>String(url).includes(p));return {ok:true,json:async()=>pkg?catalogs[pkg]:manifest};}};vm.createContext(s);for(const file of ['player-rework-accessory-test.js','paper-doll-96-lobby.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),s);return {s,notices,urls};}
test('the accessory mannequin reports unsupported motion and stays isolated from the map',async()=>{
 const {s,notices}=scope(),options={search:'?reworkTest=accessories',baseURL:'https://example.test/index.html'};
 const lobby=s.MarePaperDoll96Lobby.create(options),pilot=s.MareReworkAccessoryTest.create(options);
 const player={},pose={action:'walk',direction:'south'},before=JSON.stringify(player);
 assert.equal(lobby.snapshot().rework.mode,'accessories');
 assert.equal(lobby.snapshot().renderer,'pending-hd');
 assert.equal(lobby.draw({},player,{...pose,consumer:'world'}),false);
 await pilot.prepare(player,pose);
 pilot.draw({},player,pose);
 assert.match(pilot.snapshot().error,/not covered/);
 assert.match(notices.at(-1),/not covered/);
 assert.equal(JSON.stringify(player),before);
});
test('accessory relative URLs resolve beside page, never under index.html or query',async()=>{const {s,urls}=scope();const r=s.MareReworkAccessoryTest.create({search:'?reworkTest=accessories&accessory=99999',baseURL:'https://example.test/game/index.html?reworkTest=accessories'});await r.prepare({},{});assert.equal(urls[0],'https://example.test/game/tools/rework-accessories/manifest.json');});
