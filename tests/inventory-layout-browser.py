"""Real-browser inventory grid and rarity visual regression, isolated saved progress."""
import copy
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for, create, fixture, saved

OUT=Path(os.environ.get('MARE_INVENTORY_EVIDENCE','/tmp/mare-inventory-visual'))
OUT.mkdir(parents=True,exist_ok=True)
SIZES=[(1440,900,9),(1280,800,9),(1180,800,8),(1024,768,7),(768,900,7),(390,844,6),(360,800,5)]
def verify_grid(page, columns):
    result=page.locator('#panelOverlay.inventory-mode .op-grid').evaluate("""e=>{
      const wrap=e.parentElement, item=e.querySelector('.op-item');
      const r=e.getBoundingClientRect(),p=wrap.getBoundingClientRect(),s=item.getBoundingClientRect();
      return {grid:r.width,wrap:p.width,slotWidth:s.width,slotHeight:s.height,
        visibleColumns:getComputedStyle(e).gridTemplateColumns.split(' ').length,
        count:e.children.length};
    }""")
    assert result['visibleColumns']==columns,result
    assert result['count']==columns*7,result
    assert result['grid']/result['wrap']>.9,result
    assert abs(result['slotWidth']-result['slotHeight'])<1.5,result
    frames=page.locator('#panelOverlay.inventory-mode .op-equip-slot.filled')
    assert frames.count()>0
    for i in range(frames.count()):
        background=frames.nth(i).evaluate('e=>getComputedStyle(e).backgroundImage')
        assert background=='none',(i,background)
    # Check every rarity on both kinds of slot with browser-computed styles.
    # Only temporary DOM classes change; the actual save and game logic do not.
    rarity_styles=page.evaluate("""() => {
      const bag=document.querySelector('#panelOverlay.inventory-mode .op-grid>.op-item:not(.empty)');
      const equipped=document.querySelector('#panelOverlay.inventory-mode .op-equip-slot.filled');
      const rarities=['common','uncommon','rare','epic','legendary','supreme'];
      const initial=[bag.className,equipped.className];
      // The equipment button inherits a global background-color transition.
      // Disable it only during synthetic rarity switches so computed colors
      // reflect the final CSS token rather than a mid-transition frame.
      const savedTransitions=[bag.style.transition,equipped.style.transition];
      bag.style.transition='none';equipped.style.transition='none';
      const alpha=color=>{
        const match=color.match(/^rgba?\\(([^)]+)\\)$/);
        const values=match?match[1].split(',').map(Number):[];
        return values.length===4?values[3]:1;
      };
      try{
        return rarities.map(rarity=>{
          for(const element of [bag,equipped]){
            element.classList.remove(...rarities.map(r=>'rarity-'+r));
            element.classList.add('rarity-'+rarity);
          }
          const backpack=getComputedStyle(bag),equipment=getComputedStyle(equipped);
          const bagArtwork=getComputedStyle(bag,'::before');
          const equipArtwork=getComputedStyle(equipped,'::before');
          return {rarity,bagFrame:bagArtwork.backgroundImage,equipFrame:equipArtwork.backgroundImage,
            bagImage:backpack.backgroundImage,equipImage:equipment.backgroundImage,
            bagColor:getComputedStyle(bag,'::after').backgroundColor,equipColor:getComputedStyle(equipped,'::after').backgroundColor,
            bagAlpha:alpha(getComputedStyle(bag,'::after').backgroundColor),equipAlpha:alpha(getComputedStyle(equipped,'::after').backgroundColor),
            bagOpacity:backpack.opacity,equipOpacity:equipment.opacity,
            bagInset:getComputedStyle(bag,'::after').inset,equipInset:getComputedStyle(equipped,'::after').inset,
            bagMask:bagArtwork.maskComposite,equipMask:equipArtwork.maskComposite,
            bagClip:bagArtwork.maskClip,equipClip:equipArtwork.maskClip,
            bagFrameSize:bagArtwork.backgroundSize,equipFrameSize:equipArtwork.backgroundSize};
        });
      }finally{
        bag.className=initial[0];equipped.className=initial[1];
        bag.style.transition=savedTransitions[0];equipped.style.transition=savedTransitions[1];
      }
    }""")
    rarity_colors={
        'common':(40,40,45),
        'uncommon':(20,55,35),
        'rare':(20,45,75),
        'epic':(50,28,70),
        'legendary':(85,60,18),
        'supreme':(85,28,28),
    }
    for style in rarity_styles:
        expected='/'+style['rarity']+'.png'
        assert expected in style['bagFrame'] and expected in style['equipFrame'],style
        assert style['bagFrame']==style['equipFrame'],style
        assert style['bagImage']==style['equipImage']=='none',style
        assert abs(float(style['bagAlpha'])-.70)<.001 and abs(float(style['equipAlpha'])-.70)<.001,style
        rgb=rarity_colors[style['rarity']]
        for key in ['bagColor','equipColor']:
            assert style[key]==f'rgba({rgb[0]}, {rgb[1]}, {rgb[2]}, 0.7)',style
        assert style['bagOpacity']==style['equipOpacity']=='1',style
        assert all(float(value.removesuffix('px').removesuffix('%'))>0 for key in ['bagInset','equipInset'] for value in style[key].split()),style
        assert style['bagMask'].split(', ')==style['equipMask'].split(', ')==['exclude','exclude'],style
        assert 'content-box' in style['bagClip'] and 'content-box' in style['equipClip'],style
        assert style['bagFrameSize']==style['equipFrameSize']=='100% 100%',style
    return result

def verify_equipment_profile(page, viewport_width):
    """Validate actual slot geometry, readable labels, preserved clicks and mobile order."""
    layout=page.evaluate("""() => {
      const core=document.querySelector('#panelOverlay.inventory-mode .op-character-core');
      const left=core.querySelector('.op-equip-side.left');
      const right=core.querySelector('.op-equip-side.right');
      const avatar=core.querySelector('.op-avatar-column');
      const rect=element=>{
        const r=element.getBoundingClientRect();
        return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
      };
      const leftSlots=[...left.querySelectorAll('.op-equip-slot')];
      const rightSlots=[...right.querySelectorAll('.op-equip-slot')];
      const slots=[...leftSlots,...rightSlots];
      const icons=slots.map(slot=>{
        const wrap=slot.querySelector('.op-slot-icon');
        const child=wrap?.querySelector('.item-icon');
        if(!child)return null;
        const w=rect(wrap),i=rect(child);
        return {dx:Math.abs(w.x+w.width/2-i.x-i.width/2),
          dy:Math.abs(w.y+w.height/2-i.y-i.height/2),
          width:i.width,frame:rect(slot.querySelector('.op-slot-frame')).width};
      }).filter(Boolean);
      return {
        columns:getComputedStyle(core).gridTemplateColumns.split(' ').length,
        core:rect(core),left:rect(left),right:rect(right),avatar:rect(avatar),
        leftCount:leftSlots.length,rightCount:rightSlots.length,
        leftOrder:leftSlots.map(s=>s.dataset.invSlot),
        rightOrder:rightSlots.map(s=>s.dataset.invSlot),
        labelFontSizes:slots.map(s=>parseFloat(getComputedStyle(s.querySelector('.op-slot-label')).fontSize)),
        labelClipping:slots.filter(s=>s.querySelector('.op-slot-label').scrollWidth>s.querySelector('.op-slot-label').clientWidth+2).map(s=>s.dataset.invSlot),
        slotWidths:slots.map(s=>rect(s).width),
        slotHeights:slots.map(s=>rect(s).height),
        icons,
        buttonsIntact:slots.every(s=>s.tagName==='BUTTON'&&s.hasAttribute('data-inv-slot')),
        profileToggle:!!document.querySelector('#invHideProfile')
      };
    }""")
    assert layout['leftCount']==5 and layout['rightCount']==6,layout
    assert layout['leftOrder']==['head','necklace','coat','legs','boots'],layout
    assert layout['rightOrder']==['weapon','cloak','gloves','ring','belt','charm'],layout
    assert layout['buttonsIntact'] and layout['profileToggle'],layout
    assert min(layout['labelFontSizes'])>=10,layout
    assert not layout['labelClipping'],layout
    assert min(layout['slotWidths'])>=54 and min(layout['slotHeights'])>=44,layout
    assert page.locator('.op-fruit-equipped [data-inv-slot=akuma_no_mi]').count()==1
    assert page.locator('#panelOverlay [data-inv-slot]').count()==12
    assert layout['icons'] and all(i['dx']<=4 and i['dy']<=4 for i in layout['icons']),layout
    # HD composition keeps equipment flanking the avatar on every viewport.
    assert layout['columns']==3,layout
    assert layout['left']['right']<=layout['avatar']['x']+2,layout
    assert layout['avatar']['right']<=layout['right']['x']+2,layout
    # Clicking the existing equipment button still selects an item and does not mutate saves.
    filled=page.locator('#panelOverlay.inventory-mode .op-equip-slot.filled')
    assert filled.count()>0
    target=filled.first.get_attribute('data-inv-slot')
    filled.first.click()
    assert page.locator(f'#panelOverlay.inventory-mode .op-equip-slot.selected[data-inv-slot="{target}"]').count()==1
    return layout

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'))
    c,q=page_for(browser)
    base=create(q);c.close()
    data=fixture(base)
    data['inventory']=[
       {'id':f'grid-{i}','def':i%33,'level':1,'plus':0,'locked':False,'obtainedAt':i+30,
        'origin':'Teste visual isolado'} for i in range(119)]
    results=[]
    for width,height,columns in SIZES:
        c,q=page_for(browser,copy.deepcopy(data),(width,height))
        keys=('inventory','equipment','gold','materials','potions','attributes','classId','factionId')
        before={key:saved(q).get(key) for key in keys}
        q.locator('#mainMenu [data-panel=inventory]').click()
        r=verify_grid(q,columns)
        equipment=verify_equipment_profile(q,width)
        q.locator('.op-grid .op-item:not(.empty)').first.click()
        assert q.locator('.op-grid .op-item.selected').count()==1
        q.screenshot(path=str(OUT/f'inventory-{width}.png'),full_page=True)
        assert {key:saved(q).get(key) for key in keys}==before,'UI changed persistent inventory/equipment data'
        results.append({'size':[width,height],'columns':columns,'grid':r,'equipment':equipment})
        c.close()
    # Exercise in-place responsive pagination: page 2 at 9x7 -> page 2 at 6x7.
    c,q=page_for(browser,copy.deepcopy(data),(1440,900))
    q.locator('#mainMenu [data-panel=inventory]').click()
    q.locator('.op-pagination [data-inv-page="1"]').first.click()
    assert verify_grid(q,9)['count']==63
    q.set_viewport_size({'width':390,'height':844})
    q.wait_for_function("document.querySelectorAll('#panelOverlay .op-grid > .op-item').length===42")
    verify_grid(q,6)
    assert q.locator('.op-pagination [data-inv-page="1"].active').count()==1
    q.screenshot(path=str(OUT/'inventory-after-resize-390.png'),full_page=True)
    c.close();browser.close()
    (OUT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print('Inventory grid desktop/tablet/mobile and resize: passed',flush=True)
