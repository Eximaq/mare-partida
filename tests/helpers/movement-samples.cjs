// Measurements consumed by browser acceptance, not gameplay simulation.
exports.movementSteps=(frames,remote)=>frames.slice(1).flatMap((b,i)=>{
  const a=frames[i],clock=remote?'observedAt':'heroSampledAt';
  // game.frame integrates camera easing with RAF time; online poses sample performance.now().
  const dt=b[clock]-a[clock],cameraDt=b.t-a.t;
  const from=remote?a.peer:a,to=remote?b.peer:b;
  return dt>0&&dt<=50&&from&&to?[{speed:Math.hypot(to.x-from.x,to.y-from.y)/dt,camera:cameraDt>0&&cameraDt<=50?Math.hypot(b.cx-a.cx,b.cy-a.cy)/cameraDt:0}]:[];
});
