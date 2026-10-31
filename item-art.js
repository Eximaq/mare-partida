'use strict';
/* Interface-only HD art; item indices and world sprites stay unchanged. */
((root)=>{
 const keys=Object.freeze(["0","1","10","11","12","13","14","15","16","17","18","19","2","20","21","22","23","24","25","26","27","28","29","3","30","31","32","4","5","6","7","8","9","adaga-de-cristal","ame-no-habakiri","book","katana-de-maelstrom","lamina-das-trevas","material","nodachi-de-fogo","nodachi-de-kairouseki","pearl-box-1","pearl-box-2","pearl-box-3","pearl_des_1","pearl_des_2","pearl_des_3","pearl_des_4","pearl_des_5","pearl_esp_1","pearl_esp_2","pearl_esp_3","pearl_esp_4","pearl_esp_5","pearl_for_1","pearl_for_2","pearl_for_3","pearl_for_4","pearl_for_5","pearl_int_1","pearl_int_2","pearl_int_3","pearl_int_4","pearl_int_5","pearl_vit_1","pearl_vit_2","pearl_vit_3","pearl_vit_4","pearl_vit_5","potion","punhal-de-netuno","punhal-flamejante","akuma_kuku_kuku","akuma_beri_beri","akuma_tori_albatroz","akuma_uma_uma","akuma_inu_dachshund","akuma_supa_supa","akuma_neko_leopard","akuma_ushi_giraffe","akuma_doru_doru","akuma_inu_wolf","akuma_horu_horu","akuma_mato_mato","akuma_ushi_bison","akuma_bomu_bomu","akuma_kobu_kobu","akuma_beta_beta","akuma_hana_hana","akuma_hoya_hoya","akuma_jiki_jiki","akuma_ryu_ryu","akuma_ope_ope","akuma_mero_mero","akuma_bari_bari","akuma_doku_doku","akuma_ito_ito","akuma_yami_yami","akuma_mera_mera","akuma_gura_gura","akuma_hie_hie","akuma_tori_phoenix"]);
 const available=new Set(keys);
 function path(key,def){
 const source=def?.fruitId||(def?.kind==='haki-book'?'book':def?.kind==='pearl-box'?'pearl-box-'+def.boxLevel:def?.pearlId||def?.icon_path?.split('?')[0].split('/').pop().replace(/\.png$/,'')||String(key));
 return available.has(source)?'assets/ui/items-hd/'+source+'.png?v=20261031-refine':null;
 }
 const api=Object.freeze({keys,path});root.MareItemArt=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
