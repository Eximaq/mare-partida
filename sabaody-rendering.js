'use strict';
// Visual forms piggyback on the standard monster/damage entries only for Sabaody actors.
((root)=>{
 const S=root.MareSabaodyMonsters,R=root.MareSpriteCombatV2,A=root.MareNewIslandArt;
 if(!S||!R||!A)return;
 const originalHurt=R.hurt,originalDraw=A.monster,views=new WeakMap();
 const viewOf=(actor,key)=>{
  let view=views.get(actor);
  if(!view){view={};views.set(actor,view);}
  const {x,y,alive,hp,attackAnim,emberFacing,moving,bob}=actor;
  return Object.assign(view,{type:key,x,y,alive,hp,attackAnim,emberFacing,moving,bob});
 };
 function hurt(actor,damage,now,opts){
  const key=S.form(actor,now,R.HURT_SECONDS);
  if(!key)return originalHurt(actor,damage,now,opts);
  if(S.recordHit(actor,damage,now))R.preload(S.catalog[key].alternateSprite);
  return originalHurt(key===actor.type?actor:viewOf(actor,key),damage,now,opts);
 }
 function monster(ctx,actor,now){
  const key=S.form(actor,now,R.HURT_SECONDS);
  if(!key)return originalDraw(ctx,actor,now);
  if(S.ended(actor)){
   views.delete(actor);
   originalHurt(actor,1,now,{protected:true});
  }
  if(key!==actor.type&&R.monster(ctx,viewOf(actor,key),now))return true;
  return originalDraw(ctx,actor,now);
 }
 R.hurt=hurt;A.monster=monster;
})(globalThis);
