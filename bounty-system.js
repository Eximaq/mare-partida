'use strict';

((root)=>{
  const rules=Object.freeze({
    version:1,base:10000,maximum:1000000000,
    reference:Object.freeze({power:100000,level:200,berry:10000000,crew:2000000,gvg:50,duels:200}),
    weights:Object.freeze({power:.30,impel:.12,level:.12,hierarchy:.12,haki:.09,achievements:.06,berry:.02,crew:.07,gvg:.06,duels:.04}),
    competitive:Object.freeze({gvg:false,duels:false})
  });
  const fraction=(value,limit)=>limit>0?Math.max(0,Math.min(1,(Number(value)||0)/limit)):0;
  const logScale=(value,limit)=>fraction(Math.log1p(Math.max(0,Number(value)||0)),Math.log1p(limit));
  const countAchievements=entries=>{
    const eligible=(entries||[]).filter(a=>a.enabled);
    return fraction(eligible.filter(a=>a.claimed||a.progress>=a.target).length,eligible.length);
  };
  function calculate(input,config=rules){
    const r=config.reference;
    const normalized={
      power:logScale(input.power,r.power),
      impel:fraction(input.impel,input.impelMax),
      level:fraction(input.level,input.levelMax??r.level),
      hierarchy:fraction(input.hierarchy,input.hierarchyMax),
      haki:fraction(input.haki,3),
      achievements:fraction(input.achievements,1),
      berry:logScale(input.berry,r.berry),
      crew:logScale(input.crew,r.crew),
      gvg:logScale(input.gvg,r.gvg),
      duels:logScale(input.duels,r.duels)
    };
    const active=id=>config.competitive[id]!==false;
    const activeWeight=Number(Object.entries(config.weights).reduce((sum,[id,weight])=>sum+(active(id)?weight:0),0).toFixed(12));
    const entries=Object.entries(config.weights).map(([id,weight])=>{
      const enabled=active(id);
      const effectiveWeight=enabled?weight/activeWeight:0;
      return {id,weight,effectiveWeight,enabled,normalized:enabled?normalized[id]:null,
        contribution:enabled?normalized[id]*effectiveWeight:0};
    });
    const score=Math.min(1,Number(entries.reduce((sum,row)=>sum+row.contribution,0).toFixed(12)));
    return {version:config.version,score,berry:Math.round(config.base*(config.maximum/config.base)**score),entries};
  }
  const api={rules,calculate,countAchievements};
  root.MareBounty=api;
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
