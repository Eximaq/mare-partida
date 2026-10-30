'use strict';
/* Existing PixelLab character and supplied Slash Tiger export; no generated artwork. */
((root)=>{
  const rules={
  "id": "akuma_neko_leopard",
  "dashRange": 256,
  "dashSpeed": 900,
  "dashBeyond": 48,
  "hitRadius": 24,
  "comboRange": 96,
  "comboTimes": [
    0,
    166,
    332,
    498
  ],
  "comboDuration": 897,
  "comboFade": 150,
  "skills": [
    {
      "key": "1",
      "name": "Bote Feroz",
      "cooldown": 12,
      "cost": 25,
      "damage_multiplier": 1.45,
      "damage_type": "physical",
      "icon_path": "assets/akuma/neko/skill-1.png",
      "description": "Avança até 4 tiles através do alvo, causando 145% de dano físico. Acertar pelas costas garante crítico com o multiplicador ativo."
    },
    {
      "key": "2",
      "name": "Fúria Felina",
      "cooldown": 16,
      "cost": 32,
      "damage_multiplier": 0.8,
      "damage_type": "physical",
      "icon_path": "assets/akuma/neko/skill-2.png",
      "description": "Executa quatro golpes de 80% de dano físico somente no alvo selecionado. Trava o movimento durante o combo e o desaparecimento do efeito."
    }
  ],
  "description": "Fruta do Diabo do tipo Zoan que concede ao usuário a agilidade, os reflexos e a ferocidade de um leopardo predador. Ao ser ativada, transforma a forma física do usuário, aumentando drasticamente sua capacidade de caça, avanço rápido e execução de ataques críticos letais."
};
  const visuals=Object.freeze({worldScale:2,furyScale:1,labelLift:48});
  const clips={
  "idle": {
    "south": {
      "image": "assets/akuma/neko/idle-south.png",
      "frames": 1,
      "size": 96,
      "feet": [
        76
      ],
      "fps": 2,
      "rgba_sha256": [
        "de275ee0811356c435b38712112e2cbf3c6dca1cca381b7c016b0371597cc39a"
      ]
    },
    "east": {
      "image": "assets/akuma/neko/idle-east.png",
      "frames": 1,
      "size": 96,
      "feet": [
        77
      ],
      "fps": 2,
      "rgba_sha256": [
        "b0ae2c8e2f897bfb34ebe43cf9640ba9db03e19143bf5bfd81abbb1662b4d4d3"
      ]
    },
    "north": {
      "image": "assets/akuma/neko/idle-north.png",
      "frames": 1,
      "size": 96,
      "feet": [
        76
      ],
      "fps": 2,
      "rgba_sha256": [
        "fe80cd8ba011456b146d26fdca78d0e6a89cad996a820755bdbb3c6db38b43bb"
      ]
    },
    "west": {
      "image": "assets/akuma/neko/idle-west.png",
      "frames": 1,
      "size": 96,
      "feet": [
        77
      ],
      "fps": 2,
      "rgba_sha256": [
        "7b46217328e91e00c606e8f361ac74bde5df4e7409485e8b221701e23564d432"
      ]
    }
  },
  "walk": {
    "north": {
      "image": "assets/akuma/neko/walk-north.png",
      "frames": 8,
      "size": 96,
      "feet": [
        78,
        78,
        79,
        78,
        76,
        77,
        79,
        79
      ],
      "fps": 10,
      "rgba_sha256": [
        "54dfb94d488990ca3bdc2f86ebc37074261a62b7f6fe487e793046f9a56ffecd",
        "1bcc9f4a01ea5152440841b68757ede7febdd9a2baa7e87be09e2044f2a0ea5d",
        "07d735d4272cae3e13348caec893490f77a2da3546bde5deb345cecc2f2f96b3",
        "f68d5b1d7778b46b2e79b68f4ca78b65768d9c544e8c3553eab915ee4be9bf52",
        "b02a317efbaab9149241709035c12ce4779a30c0f9167bbe86aba087a87df962",
        "c4240b6532ac0026f290c7bdcf2f799e5e49031bc02d260ea92f24918d95eba3",
        "49d02d7f9a49f9e914fb29e42d5f585b876ae9a8577f1c6aae82debb1723f9af",
        "ca7409a5577fe418adf6d58fb5026de7263d84aee91715fef1e22b46e4126abe"
      ]
    },
    "south": {
      "image": "assets/akuma/neko/walk-south.png",
      "frames": 8,
      "size": 96,
      "feet": [
        80,
        79,
        79,
        80,
        80,
        80,
        79,
        79
      ],
      "fps": 10,
      "rgba_sha256": [
        "4ee371f96c06ea3181f9c69157062faa5940c1db85a6384cf8192bf51527b5d5",
        "ca20a7d85f7be99e1800537e688dec138767e59a23a64c93c9e64d9d681bb9f8",
        "676fea0e931ef7785461e3235305990c984a498e44b181ac9c0daabcf4a6eac7",
        "3c1aa4445992110f3778e0aa0cd3aad459d9b717ede80b334385e81183bfc5b1",
        "c075e3736d37fb94dbaa5452a15f247f3eb8be5e86b775e5bb1f03b4a2e1bd4c",
        "39951b39048e26577683174e33ba6071a33e5b1f16aca1041342ce4ab187eb17",
        "ad65246027f4474855869a138054d370d51fc933467b4318a01d6ccc20cb00b7",
        "bb3b496e51163e8a0c7ecfa80628aa5627c37705807373eba6d4b215afe6fa6b"
      ]
    },
    "east": {
      "image": "assets/akuma/neko/walk-east.png",
      "frames": 8,
      "size": 96,
      "feet": [
        79,
        79,
        79,
        77,
        76,
        76,
        76,
        77
      ],
      "fps": 10,
      "rgba_sha256": [
        "689e34853356f2216840ee38c348c431245a4cd91dd3ba58b937cd48a83d7d47",
        "00167ca160cbad374e73ae1c886944ae15619a20fcf74d4705783e10d11eaf67",
        "fb62882468aeca3231a8e6c5c17610249df41a3a58edfe59b2aa9617ce53af8d",
        "7c5eee4ce3687cc94d041ea4adda9689b8f62ad41105caee9c881df4d97e41ef",
        "3b1484d0c18d6f73e2f6cc60c1431d4b9aba14be5f326bac3fcac6b6941bfaa7",
        "840d51e4c6e19aea5114170e721f62aacbd21a8b68937e2039316e774dacee16",
        "2833f4f7b6645b14900243e351d5509c8585d4b026b9caa6ac0e71ba43fa7a0f",
        "fffc294aabc3d34e45eee5bea6935ebc5b059a3d2fe90e40aca3640e50aba4cc"
      ]
    },
    "west": {
      "image": "assets/akuma/neko/walk-west.png",
      "frames": 8,
      "size": 96,
      "feet": [
        79,
        79,
        79,
        77,
        76,
        76,
        76,
        77
      ],
      "fps": 10,
      "rgba_sha256": [
        "015b6e305375aa549571ead4851a3d1442a580218c22f7867d5bbb7e6278f934",
        "76df1d2743d5537698abff006ccecaedf064420cd34d57371e8cda542fbdaeff",
        "4c6469c20b85b8ff91ece8c8aa7ce767587beca579196851a8fed023f5531510",
        "e0a6ced4b82bdf63f25a8603b30d6521002fe1895e93202897015756259e689d",
        "d11f695bc1c41dd25a4b8a7610e1cd8c765bf663df0f423d3d67d42e29843ee0",
        "01dd83bf9e32c20b079fc360b568e04ef84522b25dc28a33070454782fcfd69a",
        "83d53d679022f63d88ae94eaf2d54ec56682916ad9f211e28b75048fab252cd8",
        "62e12626fddbdb1be5e664c779cd0a038c3cc05debd8c03b022f3811a9fc8a1d"
      ]
    }
  },
  "attack": {
    "north": {
      "image": "assets/akuma/neko/attack-north.png",
      "frames": 6,
      "size": 96,
      "feet": [
        74,
        74,
        74,
        74,
        74,
        76
      ],
      "fps": 12,
      "rgba_sha256": [
        "cb13649dcd3124dc6116066705d02e47bb7667fafcae2387d4b2378fb57f5e24",
        "365945d7aeb45e22dba0670f314a78c4c85b1a2e0e3b54c1a5b810788b6f9aa4",
        "223f5b7debc25482b811361188b2d6e3c44c43725c7139bd086f8622e10fb93a",
        "17f6d772af405352d4d0242413e7f090e2c0d112ffccdf7aaee43fa8b8ee49bb",
        "9081f6a8568dff5d082e56f0b2b72127d8234213ec7504afa9ed014a38425eb1",
        "a0d1e81520518bb8849026450afa65aa89fd971cb276d609716f4d37015b24f9"
      ]
    },
    "west": {
      "image": "assets/akuma/neko/attack-west.png",
      "frames": 6,
      "size": 96,
      "feet": [
        76,
        76,
        76,
        76,
        75,
        77
      ],
      "fps": 12,
      "rgba_sha256": [
        "cf2c990ca93e9a3702cbf2db9c0fa9d0c93f6eb21886fd9f075e160b0c390392",
        "1c8922cea90684f1d804f6ce5d25c012a27dba03c671ef2395f3b7f70ac02ed2",
        "bb5e06a25d4153ad50e8dddbe8e7eae3256864b56b414adb3ef9d93d551c00d2",
        "252db14b58a41892af9eb95d107e53f455ca43d181c799aac76508e49e959797",
        "3a6706dd65fba76fd3f4f2bb8b56314d8be570848ab7c2f6482980bad1ad79e2",
        "93809e52b5e195ba61c64de0bf124543819af08d6418b8d87471eee25491e6d9"
      ]
    },
    "east": {
      "image": "assets/akuma/neko/attack-east.png",
      "frames": 6,
      "size": 96,
      "feet": [
        76,
        76,
        76,
        76,
        75,
        77
      ],
      "fps": 12,
      "rgba_sha256": [
        "1f144513783e8d253bd77cad1b0c9a8a0c3fd5818ecad0c8fbb30889225f1ee8",
        "fa9765a1d0e7e018e5f91e7126a370517d11cbb491d33dad9ac72b6b3cc044db",
        "2ba09359adbc3f9e439ceb4c8713f4b1c60a9340d22d7bf11c5491a2c23ef2f4",
        "821ce2c52834f820354044d79b9c389aac1ea7ecb0fda3cc8bc2cf62aab1bce5",
        "ee7a5333899776d0ed820ff0189c16617c99d8edac819e72c83b691e2e78795c",
        "112d294ec6e45e211614e42a3fa2f68d1c0fd57de33ca66f89c10544b077b446"
      ]
    },
    "south": {
      "image": "assets/akuma/neko/attack-south.png",
      "frames": 6,
      "size": 96,
      "feet": [
        77,
        78,
        78,
        76,
        76,
        76
      ],
      "fps": 12,
      "rgba_sha256": [
        "bf72de57ad5a59df951cfd7fd876f6220fb7f263260603a74f1131853e64282f",
        "a1d0b73ac1c574764a3430f1afa6cd08f3d55a4a260ad5d9b50ca297f240c255",
        "038793bcf6121bb79e600494f941cd5594e0060993bef42967ce509c09004e66",
        "42eb8b6ec8611d32c5499f29512e30094bffdc6a1bd3fa025dc2a065f0e7b621",
        "047fdf0535be525c5cf262edcc2cf510c8eff52bb3cee26e30394396b9ece25e",
        "a01998178553ff34f58e4aa35716b6d30cde1c3b48203b751e42a08a1a5d6f67"
      ]
    }
  },
  "dash": {
    "north": {
      "image": "assets/akuma/neko/dash-north.png",
      "frames": 9,
      "size": 96,
      "feet": [
        76,
        75,
        75,
        82,
        82,
        82,
        82,
        82,
        76
      ],
      "fps": 12,
      "rgba_sha256": [
        "fe80cd8ba011456b146d26fdca78d0e6a89cad996a820755bdbb3c6db38b43bb",
        "761b5f39967dd42b45de31a3e4eaee625cb8d90b2e55867f557934e8d9aa4ca9",
        "5602308495b7fd7b8c485c8cfb125e1f3913ec98ff4fe25ddc4eb7f0b60c112f",
        "f4249e0a2652be2acb3af6c295168e056dd7e33e7bec0053afa59c55f16f7673",
        "76940974bf9fe5b194d54e292ecd869f86478caff5e9a55d74d7449a12208de1",
        "bd958bc8d91e0f550ac01fefff5ff21e331fdf6336d348496efdd90026fd4ae2",
        "45f8c03a580fb83f7df6128dd787aae90741ac956dd36a224e29367d0238fb4f",
        "c4c6b15cbd4683c1ae840070169ce4bf0a4746800a50bb5e4fc3fb0d51462c34",
        "52d775c9ad6b898ce72ce0a2b4e06d016b2a31d0888d84b7cec570e4c34d66ea"
      ]
    },
    "south": {
      "image": "assets/akuma/neko/dash-south.png",
      "frames": 9,
      "size": 96,
      "feet": [
        76,
        76,
        80,
        80,
        80,
        80,
        80,
        77,
        76
      ],
      "fps": 12,
      "rgba_sha256": [
        "de275ee0811356c435b38712112e2cbf3c6dca1cca381b7c016b0371597cc39a",
        "32d60a166724c97582e28e3ba62e50833a5025546ba837a69695e5be87ddf3cd",
        "f23e0638f280dba5ccd25f90a77ac701e9a8c5871ee38975b60a4273bad80b29",
        "d8374ff01c4ad242ff231ac2a93524435a0a8b4ff85fcb00664b6bc7823f849a",
        "4cd00fc26eb4e47bbca0bd66d53b4c723ee9fb3385ba3004f43cabafbfe0d242",
        "bc7e329bf966378306dac2627491e1586bf3ebb2b45f4c1546a4845cf4287823",
        "488635983d1293a36acbc16d5c5c39d4d3a0a86483d57e3363cf96ddd5c4b37e",
        "962830c574c7954ca0f84b8544668025826cf153ef7d1d80a88053399893bc2a",
        "377c3bef1158ef0b69911301c88a271632f2648434a14cb9c1ffd4f3b2ac458a"
      ]
    },
    "east": {
      "image": "assets/akuma/neko/dash-east.png",
      "frames": 9,
      "size": 96,
      "feet": [
        77,
        77,
        77,
        77,
        77,
        77,
        77,
        77,
        77
      ],
      "fps": 12,
      "rgba_sha256": [
        "b0ae2c8e2f897bfb34ebe43cf9640ba9db03e19143bf5bfd81abbb1662b4d4d3",
        "55747a5dd1b5208a631a859ed75ebee4fbc9f7b98c0e194894283ddb5c2a445d",
        "95964d6a6faf0481aaf9c6c777b34d70a2e81482ab5a40d14d3e903b9176cd7f",
        "baca94a4fd386c7f6627754cc19e14f8ee2efaeabe90ff972245578300b00a78",
        "2888b66ab1b5313ef7544b5c34aa365d10981ba39722b95426c5c5a1f3ca90f7",
        "0da671928455351d2cedc77c25d1773d7dadcfde124b3ba51b031e29c853cc02",
        "2d43c9bdadf724dda313fc25c1f058543cca101ac75c15e45e944989e5d644c3",
        "5d799c720cd2c7f80c4496c772b7446aa49fed565d085c54236e808aee9f1dac",
        "ea80e18bcc3f38836bfcb784e249185034937a060093137bce6cdaab6e8e4d79"
      ]
    },
    "west": {
      "image": "assets/akuma/neko/dash-west.png",
      "frames": 9,
      "size": 96,
      "feet": [
        77,
        77,
        77,
        77,
        77,
        77,
        77,
        77,
        77
      ],
      "fps": 12,
      "rgba_sha256": [
        "f88cb8bd6414fb32dd6b275e90818ecac9ea1bee9ff26596baaacb24f13a7e55",
        "f84eb7ef1734e9eca351372ca8dac80dfb38425ea99252e78b08e368a67a469b",
        "d2a21dfcc4980b3aaf93382e1be44cf934489e17fa57f2d7ae51cd92760faa6f",
        "993a229afbc21a0a7156765d20da7f9ff92e75ff1f72e1cdf2dc184515a7790b",
        "740bb333f96a93bbe52f8a46298cf4959de98ef93e067e7ce157d43bae726854",
        "7846138e65acde0c50bea2753e22d99abb6736d028453c03b8bc7a5050c9b161",
        "a1c3180fa363a327ee496d06ebce40232dabc92960fbf0baf39374d375e05a5e",
        "9a7e5061e2a2c7fe750fea18a8ae0a5112cf233f4433fc0b694f4aec5e3a2e55",
        "90b93912dbc0a5544521ee0186198b7847b0508c50a1bcf5d3a5913e346a36ef"
      ]
    }
  }
};
  const vfx={
  "image": "assets/akuma/neko/slash-tiger.png",
  "anchor": {
    "kind": "origin",
    "x": 48,
    "y": 48
  },
  "frames": [
    {
      "x": 0,
      "y": 0,
      "w": 64,
      "h": 64,
      "duration": 83
    },
    {
      "x": 64,
      "y": 0,
      "w": 64,
      "h": 64,
      "duration": 83
    },
    {
      "x": 128,
      "y": 0,
      "w": 64,
      "h": 64,
      "duration": 83
    },
    {
      "x": 0,
      "y": 64,
      "w": 64,
      "h": 64,
      "duration": 83
    },
    {
      "x": 64,
      "y": 64,
      "w": 64,
      "h": 64,
      "duration": 83
    },
    {
      "x": 128,
      "y": 64,
      "w": 64,
      "h": 64,
      "duration": 83
    },
    {
      "x": 0,
      "y": 128,
      "w": 64,
      "h": 64,
      "duration": 83
    },
    {
      "x": 64,
      "y": 128,
      "w": 64,
      "h": 64,
      "duration": 83
    },
    {
      "x": 128,
      "y": 128,
      "w": 64,
      "h": 64,
      "duration": 83
    }
  ],
  "duration": 747
};
  const facingVectors={south:[0,1],north:[0,-1],west:[-1,0],east:[1,0],front:[0,1],back:[0,-1],left:[-1,0],right:[1,0]};
  function backstab(dx,dy,facing){const f=Array.isArray(facing)?facing:facingVectors[facing];const d=Math.hypot(dx,dy),length=f&&Math.hypot(...f);return !!(d>0&&length>0&&(dx*f[0]+dy*f[1])/(d*length)>=Math.SQRT1_2-1e-9);}
  function segmentHit(from,to,target,radius=rules.hitRadius){const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy;if(!length)return Math.hypot(target.x-from.x,target.y-from.y)<=radius;const t=Math.max(0,Math.min(1,((target.x-from.x)*dx+(target.y-from.y)*dy)/length));return Math.hypot(from.x+dx*t-target.x,from.y+dy*t-target.y)<=radius;}
  function dueHits(action,elapsed){const out=[];while(action.nextHit<rules.comboTimes.length&&elapsed>=rules.comboTimes[action.nextHit])out.push(action.nextHit++);return out;}
  const images=new Map(),directionNames={front:'south',back:'north',left:'west',right:'east'};
  function image(url){if(!images.has(url)){const im=new Image();im.addEventListener?.('load',()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('mare-zoan-sprite-ready'));});im.src=url;images.set(url,im);}return images.get(url);}
  function preload({actors=true}={}){if(actors)for(const dirs of Object.values(clips))for(const clip of Object.values(dirs))image(clip.image);image(vfx.image);}
  function status(action='idle',direction='front'){const clip=clips[action]?.[directionNames[direction]||direction]||clips.idle.south,im=image(clip.image);return !im.complete?'loading':im.naturalWidth?'ready':'failed';}
  function drawActor(c,x,y,{action='idle',direction='front',time=0,scale=1,progress=null}={}){
    const clip=clips[action]?.[directionNames[direction]||direction]||clips.idle.south,im=image(clip.image);if(!im.complete||!im.naturalWidth)return false;
    const step=Number.isFinite(progress)?Math.min(clip.frames-1,Math.floor(Math.max(0,Math.min(1,progress))*clip.frames+1e-9)):Math.max(0,Math.floor(time*clip.fps)),frame=['attack','dash'].includes(action)?Math.min(clip.frames-1,step):step%clip.frames;
    c.save();c.imageSmoothingEnabled=false;c.drawImage(im,frame*clip.size,0,clip.size,clip.size,Math.round(x-clip.size*scale/2),Math.round(y-clip.feet[frame]*scale),Math.round(clip.size*scale),Math.round(clip.size*scale));c.restore();return true;
  }
  function vfxFrame(elapsed){if(elapsed<0||elapsed>=rules.comboDuration)return null;let t=Math.min(elapsed,vfx.duration-1);for(const frame of vfx.frames){if(t<frame.duration)return frame;t-=frame.duration;}return null;}
  function drawSlash(c,x,y,elapsed,scale=visuals.furyScale){const frame=vfxFrame(elapsed),im=image(vfx.image);if(!frame||!im.complete||!im.naturalWidth)return false;c.save();c.imageSmoothingEnabled=false;if(elapsed>vfx.duration)c.globalAlpha*=Math.max(0,1-(elapsed-vfx.duration)/rules.comboFade);c.drawImage(im,frame.x,frame.y,frame.w,frame.h,Math.round(x-vfx.anchor.x*scale),Math.round(y-vfx.anchor.y*scale),frame.w*scale,frame.h*scale);c.restore();return true;}
  root.MareNeko={rules,visuals,clips,vfx,backstab,segmentHit,dueHits,preload,status,drawActor,vfxFrame,drawSlash};
  if(typeof module!=='undefined')module.exports=root.MareNeko;
})(globalThis);
