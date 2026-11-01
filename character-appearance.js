/* Shared, versioned cosmetics. No class, attributes, equipment or storage ownership. */
(function(root){
  'use strict';
  const skins = {
    porcelain: { name: 'Porcelana', ramp: ['#694a40','#a57360','#d9a68b','#f4c7aa','#ffe3c6'] },
    light: { name: 'Claro', ramp: ['#634332','#956346','#c98e61','#edb17d','#ffd09c'] },
    warm: { name: 'Dourado', ramp: ['#543323','#855030','#b87943','#d99a5b','#f4bd7c'] },
    olive: { name: 'Oliva', ramp: ['#44382b','#6d573b','#9a7b50','#bda06a','#ddc58c'] },
    copper: { name: 'Cobre', ramp: ['#432b25','#6c3e2c','#985937','#bd7a49','#dfa169'] },
    brown: { name: 'Moreno', ramp: ['#33231f','#50352a','#795039','#a27450','#c3976c'] },
    dark: { name: 'Escuro', ramp: ['#241c1b','#3b2925','#573c30','#785641','#a27b59'] },
    ebony: { name: 'Ébano', ramp: ['#19171a','#2a2325','#41312e','#5d463b','#82654f'] }
  };
  const hairs = {
    black: { name: 'Preto', ramp: ['#10131c','#202530','#353d49','#58616c','#7f8994'] },
    brown: { name: 'Castanho', ramp: ['#23171b','#452c27','#70472f','#a06a42','#cf995f'] },
    blonde: { name: 'Loiro', ramp: ['#4b3425','#805930','#b68a44','#dec574','#fff0ad'] },
    auburn: { name: 'Ruivo', ramp: ['#321923','#612b28','#9b4530','#cf713f','#f6ac65'] },
    silver: { name: 'Prateado', ramp: ['#34354d','#5c627b','#929bb0','#c4cddb','#edf1f5'] },
    blue: { name: 'Azul', ramp: ['#171b3b','#253565','#365a96','#5b91c6','#93d0e5'] },
    violet: { name: 'Violeta', ramp: ['#281b3b','#493369','#77509a','#ae7bc1','#dfb1e3'] },
    pink: { name: 'Rosa', ramp: ['#3e233a','#75405d','#ad6585','#d898b0','#f7cbda'] },
    green: { name: 'Verde', ramp: ['#172f2e','#2c5043','#497d58','#80ad72','#bbdca4'] },
    white: { name: 'Branco', ramp: ['#545369','#85869a','#b4bbca','#dce3ea','#ffffff'] }
  };

  const eyes={blue:{name:'Azul',ramp:['#123047','#245573','#3b87ac','#79c4df','#b7e8ed']},brown:{name:'Castanho',ramp:['#2c211b','#553622','#85532f','#b97c46','#deae74']},green:{name:'Verde',ramp:['#16352c','#28533d','#45865b','#83b87d','#bfdda8']},gray:{name:'Cinza',ramp:['#28323c','#4a5b67','#7d929c','#b1c5cc','#dce8e8']},amber:{name:'Âmbar',ramp:['#453017','#755020','#a97e2b','#dbb34b','#f4dc8a']},violet:{name:'Violeta',ramp:['#2c2143','#543d73','#8064a4','#b79acd','#dfc9ee']}};
  const hairStyles={original:'Original',none:'Sem cabelo','hair-cropped':'Curto rente','hair-spiky':'Espetado','hair-swept':'Lateral','hair-bob':'Chanel','hair-wavy':'Ondulado','hair-braided':'Tranças presas','hair-ponytail':'Rabo de cavalo','hair-curly':'Cacheado curto','hair-long':'Longo repartido','hair-undercut':'Undercut','hair-topknot':'Coque alto','hair-afro':'Afro arredondado'};
  const eyeStyles={original:'Original','face-calm':'Sereno','face-resolute':'Determinado','face-almond':'Amendoado','face-focused':'Atento'};
  const names={gender:'Gênero',hairStyle:'Cabelo',hairColor:'Cor do cabelo',eyeStyle:'Olhos',eyeColor:'Cor dos olhos',skinStyle:'Pele',skinColor:'Cor da pele'};
  const namesOf=table=>Object.fromEntries(Object.entries(table).map(([id,p])=>[id,p.name]));
  const choices={gender:{masculino:'Masculino',feminino:'Feminino'},hairStyle:hairStyles,hairColor:namesOf(hairs),eyeStyle:eyeStyles,eyeColor:namesOf(eyes),skinStyle:{natural:'Natural'},skinColor:namesOf(skins)};
  const defaults=Object.freeze({version:1,gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinStyle:'natural',skinColor:'light'});
  function normalize(value={}){const out={...defaults};for(const key of Object.keys(choices))if(Object.hasOwn(choices[key],value?.[key]))out[key]=value[key];return out;}
  function legacyLook(player){const v=player?.paperDollLook;return {version:1,hair:v?.version===1&&v.hair==='bald'?'bald':'short-black',outfit:v?.version===1&&v.outfit==='base'?'base':'navy'};}
  function read(player){return normalize(player?.appearance96||{hairStyle:player?.paperDollLook?.hair==='bald'?'none':'original'});}
  function apply(player,value){const appearance96=normalize(value);return {...player,appearance96,paperDollLook:{version:1,outfit:'navy',...player?.paperDollLook,hair:appearance96.hairStyle==='none'?'bald':'short-black'}};}
  function commit(player,value,persist){const next=apply(player,value);return persist(next)===false?null:next;}
  function toLook(player){const a=read(player);return {body:a.gender,hair:a.hairStyle,face:a.eyeStyle,hairColor:a.hairColor,eyeColor:a.eyeColor,skin:a.skinColor,kit:'equipped'};}
  function recolorEyes(source,indices=[],color){const ramp=eyes[color]?.ramp;if(!ramp)return source;const out=new Uint8ClampedArray(source);for(const [p,tone]of indices){const i=p*4;if(!Number.isInteger(p)||i<0||i+3>=out.length||!out[i+3])continue;const rgb=ramp[Math.max(0,Math.min(4,tone-1))].match(/[a-f0-9]{2}/gi).map(n=>parseInt(n,16));out.set(rgb,i);}return out;}
  const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function fields(value,prefix='appearance'){const a=normalize(value);return Object.entries(choices).map(([key,options])=>{const palette=({hairColor:hairs,eyeColor:eyes,skinColor:skins})[key];return '<div class="appearance-field" data-appearance-field="'+key+'"><img class="studio-control-icon" src="assets/ui/character-studio/controls/'+key+'.png?v=alpha-native-v1" alt=""><label for="'+prefix+'-'+key+'">'+names[key]+'</label><div class="appearance-selector"><button type="button" data-appearance-cycle="'+key+'" data-step="-1" '+(Object.keys(options).length<2?'disabled':'')+' aria-label="'+names[key]+': opção anterior">‹</button><select id="'+prefix+'-'+key+'" data-appearance="'+key+'">'+Object.entries(options).map(([id,name])=>'<option value="'+E(id)+'" '+(a[key]===id?'selected':'')+'>'+E(name)+'</option>').join('')+'</select><button type="button" data-appearance-cycle="'+key+'" data-step="1" '+(Object.keys(options).length<2?'disabled':'')+' aria-label="'+names[key]+': próxima opção">›</button></div>'+(palette?'<div class="appearance-swatches" role="group" aria-label="'+names[key]+'">'+Object.entries(palette).map(([id,p])=>'<button type="button" class="appearance-swatch" style="--swatch:'+p.ramp[3]+'" data-appearance-color="'+key+'" data-value="'+id+'" aria-label="'+p.name+'" title="'+p.name+'" aria-pressed="'+(a[key]===id)+'"></button>').join('')+'</div>':'')+'</div>';}).join('');}
  root.MareCharacterAppearance={skins,hairs,eyes,choices,names,defaults,normalize,legacyLook,read,apply,commit,toLook,recolorEyes,fields};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MareCharacterAppearance;
})(globalThis);
