'use strict';
/* Reviewed choices only. Artwork and equipment bindings remain in the pack. */
((root)=>{
  const data={
    defaults:{version:1,hair:'short-black',outfit:'navy'},
    groups:{
      hair:{label:'Cabelo',slot:'hair',options:[
        {id:'short-black',label:'Curto preto',approved:true,useDefault:true},
        {id:'bald',label:'Sem cabelo',approved:true,hidden:true}
      ]},
      outfit:{label:'Roupa padrão',slot:'outfit',equipmentSlot:'coat',options:[
        {id:'navy',label:'Colete azul e linho',approved:true,useDefault:true},
        {id:'base',label:'Somente corpo-base',approved:true,hidden:true}
      ]}
    }
  };
  root.MarePaperDollLookData=data;
  if(typeof module!=='undefined'&&module.exports)module.exports=data;
})(typeof globalThis!=='undefined'?globalThis:window);
