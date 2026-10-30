/* Canonical 96px materials. The whole head/limb family mirrors about the foot pivot. */
'use strict';
function mirror(source,width=128,height=128,sum=width){const out=new Uint8ClampedArray(source.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const xx=sum-x;if(xx>=0&&xx<width)out.set(source.subarray((y*width+x)*4,(y*width+x+1)*4),(y*width+xx)*4);}return out;}
function components(source,width=128,height=128){const seen=new Uint8Array(width*height),groups=[];for(let p=0;p<seen.length;p++){if(seen[p]||!source[p*4+3])continue;const g=[p];seen[p]=1;for(let n=0;n<g.length;n++){const q=g[n],x=q%width,y=Math.floor(q/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,j=yy*width+xx;if(xx<0||xx>=width||yy<0||yy>=height||seen[j]||!source[j*4+3])continue;seen[j]=1;g.push(j);}}groups.push(g);}return groups.sort((a,b)=>b.length-a.length);}
function extractHair(source,mask){const out=new Uint8ClampedArray(source.length);for(let i=0;i<out.length;i+=4){if(mask[i]<128||source[i+3]<128)continue;const r=source[i],g=source[i+1],b=source[i+2];if(r>235&&g>130&&r>b*1.3)continue;out.set([r,g,b,255],i);}const groups=components(out);for(const g of groups.slice(1))for(const p of g)out.fill(0,p*4,p*4+4);return out;}
function features(source,head,protectedPixels=[]){const keep=new Set(protectedPixels);const out=new Uint8ClampedArray(source.length);for(let i=0;i<out.length;i+=4){if(!source[i+3]||!head[i+3])continue;const r=source[i],g=source[i+1],b=source[i+2],skin=r>80&&r>b*1.28&&g/r>.4&&g/r<.91;if(!skin||keep.has(i/4))out.set([r,g,b,255],i);}return out;}
function simplify(source,palette){const out=new Uint8ClampedArray(source);for(let i=0;i<out.length;i+=4){if(out[i+3]<128){out.fill(0,i,i+4);continue;}let best=Infinity,c=palette[0];for(const rgb of palette){const d=(out[i]-rgb[0])**2+(out[i+1]-rgb[1])**2+(out[i+2]-rgb[2])**2;if(d<best){best=d;c=rgb;}}out.set([...c,255],i);}return out;}

function cloak(source,itemId){
 const points=[],cloth=(r,g,b)=>itemId===24?(r>g*1.2&&b>g*1.05&&r<210):(r>70&&g>=b+.57*(r-b)&&b/r<.65&&r<235);
 for(let y=44;y<96;y++)for(let x=36;x<92;x++){const i=(y*128+x)*4;if(source[i+3]&&cloth(source[i],source[i+1],source[i+2]))points.push([x,y]);}
 if(points.length<20)throw Error('Cape material not found');
 points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lower=[],upper=[];
 for(const p of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of [...points].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}const hull=lower.slice(0,-1).concat(upper.slice(0,-1));
 const inside=(x,y)=>{let hit=false;for(let i=0,j=hull.length-1;i<hull.length;j=i++){const a=hull[i],b=hull[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 const out=new Uint8ClampedArray(source.length),maxY=Math.max(...points.map(p=>p[1]));
 for(let y=43;y<=maxY+1;y++)for(let x=35;x<93;x++){const i=(y*128+x)*4;if(!inside(x,y)&&!inside(x+.4,y+.4))continue;
 const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!inside(x+dx,y+dy));let colour=itemId===24?[123,62,79]:[174,143,57];
 if(source[i+3]&&cloth(source[i],source[i+1],source[i+2]))colour=Array.from(source.subarray(i,i+3));
 if(edge)colour=y>maxY-3?(itemId===24?[181,146,74]:[122,94,36]):[27,22,30];
 out.set([...colour,255],i);
 }return out;
}

module.exports={mirror,components,extractHair,features,simplify,cloak};
