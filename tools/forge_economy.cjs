const fs=require('node:fs'),path=require('node:path'),F=require('../forge-system.js');
let seed=72910;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed+.5)/4294967296;};
let cost=0,pearls=1;const expected=[{level:1,gold:0,level1Pearls:1}];
for(let tier=0;tier<4;tier++){cost=(5*cost+F.fusion[tier].gold)/F.fusion[tier].chance;pearls=pearls*5/F.fusion[tier].chance;expected.push({level:tier+2,gold:cost,level1Pearls:pearls});}
const samples=[];
for(let trial=0;trial<2000;trial++){
 let outputs=1,gold=0;
 for(let tier=3;tier>=0;tier--){const {chance,gold:fee}=F.fusion[tier];let attempts=0;for(let i=0;i<outputs;i++)attempts+=Math.floor(Math.log1p(-random())/Math.log1p(-chance))+1;gold+=attempts*fee;outputs=attempts*5;}
 samples.push({gold,level1Pearls:outputs});
}
const sorted=samples.map(s=>s.gold).sort((a,b)=>a-b),mean=key=>samples.reduce((sum,s)=>sum+s[key],0)/samples.length;
const costs=[];for(const level of [1,5,10,20,30])for(const rarity of Object.keys(F.rarity))costs.push({level,rarity,...F.reforgeCost({level,rarity})});
const result={chances:F.fusion,expected,monteCarlo:{seed:72910,trials:2000,meanGold:mean('gold'),meanLevel1Pearls:mean('level1Pearls'),medianGold:sorted[1000],p90Gold:sorted[1800],p95Gold:sorted[1900]},reforgeCosts:costs,acquisition:{level1Drop:.05,uniformTypes:5,targetAttributeDrop:.01,expectedKillsForTargetLevel5:expected[4].level1Pearls/.01}};
const out=path.resolve(__dirname,'../docs/balance-data');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'forge-economy.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({expected,monteCarlo:result.monteCarlo,acquisition:result.acquisition},null,2));
