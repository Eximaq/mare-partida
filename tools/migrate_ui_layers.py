"""One-time CSSOM migration: retain legacy declarations, isolate their old priority.

Run only on unlayered stylesheets. Browser parsing preserves declaration values;
previous important declarations become normal rules in legacy-priority, above
legacy. New unlayered UI components can evolve without specificity escalation.
Requires the same Playwright installation used by browser QA; no runtime dependency.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
FILES=['styles.css','ui-nautical.css','character-menu.css','modes-menu.css','inventory-compact.css','audio-system.css']
with sync_playwright() as p:
    browser=p.chromium.launch();page=browser.new_page();page.set_content('<html><head></head><body></body></html>')
    for name in FILES:
        path=ROOT/name;source=path.read_text(encoding='utf-8')
        if '@layer legacy' in source:continue
        result=page.evaluate('''source=>{
          const tag=document.createElement('style');tag.textContent=source;document.head.append(tag);
          let count=0;
          function split(rules){let normal=[],priority=[];
            for(const r of rules){
              if(r.type===1){let a=[],b=[];for(const key of r.style){const value=r.style.getPropertyValue(key);if(r.style.getPropertyPriority(key)){b.push(key+':'+value+';');count++;}else a.push(key+':'+value+';');}
                if(a.length)normal.push(r.selectorText+'{'+a.join('')+'}');if(b.length)priority.push(r.selectorText+'{'+b.join('')+'}');
              }else if(r.cssRules&&r.type!==7){const s=split(r.cssRules),head=r.cssText.slice(0,r.cssText.indexOf('{'));if(s.normal)normal.push(head+'{'+s.normal+'}');if(s.priority)priority.push(head+'{'+s.priority+'}');}
              else normal.push(r.cssText);
            }return {normal:normal.join('\\n'),priority:priority.join('\\n')};
          }
          const result=split(tag.sheet.cssRules);tag.remove();return {...result,count};
        }''',source)
        path.write_text('/* Legacy feature styles, isolated for UI 2.0. See docs/UI-DESIGN-SYSTEM.md. */\n@layer legacy, legacy-priority;\n@layer legacy {\n'+result['normal']+'\n}\n@layer legacy-priority {\n'+result['priority']+'\n}\n',encoding='utf-8')
        print(name,': isolated',result['count'],'priority declarations')
    browser.close()
