/* Pure Luffy animation selection. Reads presentation clocks; never changes combat or inventory. */
(function (root) {
  'use strict';
  const DIRECTIONS = {front:'south',back:'north',left:'west',right:'east'};
  const PRIMARY = {sword:'sword_sabre',brawler:'brawler_bare',gunner:'gunner_rifle',rogue:'rogue_single_dagger',cyborg:'cyborg_hydraulic',strategist:'strategist_staff',healer:'healer_staff'};
  const TECH = new Set([15,118,120]);
  const ORBS = new Set([17,122]);
  const STAFF = new Set([123]);
  const SCEPTERS = new Set([121,124]);
  const ROGUE_PAIRED = new Set([12,13,71,72,73,74]);
  function loadoutFor(atlas, input = {}) {
    if (input.weaponless || input.unarmed || input.weaponEquipped === false) return 'brawler_bare';
    const explicit = atlas.loadouts.find(x => x.id === input.loadout && (input.classId == null || x.classId === input.classId));
    if (explicit) return explicit.id;
    const cls = input.classId || 'sword', id = Number(input.weaponId);
    if (cls === 'brawler') return input.weaponId == null ? 'brawler_bare' : 'brawler_gauntlets';
    if (input.weaponId == null && input.paired == null) return PRIMARY[cls] || PRIMARY.sword;
    if (cls === 'gunner') return id === 114 || input.paired ? 'gunner_dual_pistols' : 'gunner_rifle';
    if (cls === 'rogue') return (input.paired ?? ROGUE_PAIRED.has(id)) ? 'rogue_dual_daggers' : 'rogue_single_dagger';
    if (cls === 'cyborg') return TECH.has(id) ? 'cyborg_cannon' : 'cyborg_hydraulic';
    if (cls === 'strategist') return ORBS.has(id) ? 'strategist_orb' : STAFF.has(id) ? 'strategist_staff' : SCEPTERS.has(id) ? 'strategist_scepter' : 'strategist_compass';
    if (cls === 'healer') return id === 32 ? 'healer_reliquary' : id === 125 ? 'healer_baton' : [31,127].includes(id) ? 'healer_cajado' : 'healer_staff';
    return PRIMARY[cls] || PRIMARY.sword;
  }
  function resolve(atlas, input = {}) {
    if (input.zoanTransformed || input.action === 'death') return null;
    const loadout = loadoutFor(atlas, input);
    const selected = atlas.loadouts.find(x => x.id === loadout);
    let clip, skill = null;
    if (input.clip) clip = input.clip;
    else if ((input.freeHandPower || input.fruitPower) && !['walk','run','idle','combat-idle','hurt'].includes(input.action || 'attack')) clip = 'cast_palm_shared';
    else if (input.skillIndex === 0 || input.skillIndex === 1) {
      if (input.classId && selected.classId !== input.classId) return null;
      skill = atlas.skills[input.classId || selected.classId]?.[input.skillIndex];
      if (!skill) return null;
      clip = skill.clip || skill.template.replace('{loadout}', loadout);
    } else {
      const a = input.action || 'idle';
      if (a === 'specialTide') clip = 'special_sword_tide';
      else if (a === 'specialHorizon') clip = 'special_sword_horizon';
      else if (['castPalm','cast-palm','cast','heal','power'].includes(a)) clip = 'cast_palm_shared';
      // The native alias also covers gauntlets and cyborg weapons. Only an
      // explicitly empty loadout uses the bare-hand clip.
      else if (a === 'attack-unarmed') clip = 'attack_' + loadout;
      else if (a === 'walk' || a === 'run') clip = 'walk_' + loadout;
      else if (a === 'hurt') clip = 'hurt_' + loadout;
      else if (a.startsWith('attack') || a === 'combo') clip = 'attack_' + loadout;
      else if (a === 'guard' && atlas.clips['guard_' + loadout]) clip = 'guard_' + loadout;
      else clip = 'idle_' + loadout;
    }
    const data = atlas.clips[clip];
    if (!data) return null;
    return {clip,loadout,skill,data};
  }
  function pose(atlas, input = {}) {
    const chosen = resolve(atlas,input);
    if (!chosen) return null;
    const d = DIRECTIONS[input.direction] || input.direction || 'south';
    const frames = chosen.data.frames[d], dir = chosen.data.directions[d];
    if (!frames?.length || !dir) return null;
    let index;
    if (Number.isInteger(input.frame)) index = ((input.frame % frames.length) + frames.length) % frames.length;
    else if (Number.isFinite(input.progress) && !chosen.data.loop) {
      const p = Math.min(1,Math.max(0,input.progress));
      const contact = chosen.data.contactFrame;
      if (Number.isInteger(contact) && contact > 0) {
        const hit = Math.min(.999,Math.max(.001,input.hitFrameRatio ?? .5));
        index = p < hit ? Math.min(contact - 1,Math.floor(p / hit * contact)) : Math.min(frames.length - 1,contact + Math.floor((p - hit) / (1 - hit) * (frames.length - contact)));
      } else index = Math.min(frames.length - 1,Math.floor(p * frames.length));
    } else index = Math.floor(Math.max(0,input.time || 0) * (input.fps || chosen.data.fps)) % frames.length;
    return {...chosen,direction:d,index,frame:frames[index],source:dir.source,scale:dir.scale,bodyHeight:dir.bodyHeight};
  }
  function draw(ctx, image, p, x, y, bodyHeight = 320) {
    const [sx,sy,w,h] = p.frame.rect, [ax,ay] = p.frame.anchor;
    const scale = bodyHeight / p.bodyHeight;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image,sx,sy,w,h,Math.round(x - ax * scale),Math.round(y - ay * scale),w * scale,h * scale);
    ctx.restore();
  }
  // Fit a complete cycle once, including its weapon sweep. This avoids scale
  // changes between frames and keeps the preview inside its allotted panel.
  function fitBodyHeight(atlas, input, desired, space, directions) {
    const chosen = resolve(atlas, input);
    if (!chosen) return desired;
    let height = desired;
    const ds = directions || [DIRECTIONS[input.direction] || input.direction || 'south'];
    for (const d of ds) {
      const dir = chosen.data.directions[d];
      if (!dir) continue;
      for (const frame of chosen.data.frames[d] || []) {
        const b = frame.visibleBounds;
        if (!b) continue;
        const [ax,ay] = frame.anchor;
        const extent = {left:ax-b[0],right:b[2]-ax,above:ay-b[1],below:b[3]-ay};
        for (const side of Object.keys(extent)) {
          if (extent[side] > 0 && Number.isFinite(space[side])) height = Math.min(height,space[side]*dir.bodyHeight/extent[side]);
        }
      }
    }
    return height;
  }
  const api = {loadoutFor,resolve,pose,draw,fitBodyHeight,PRIMARY};
  root.MareLuffyAnimation = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
