"""Record receipts and a portable recipe, never credentials or account balances."""
import json,re,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/orange-town-20261020'
calls=json.loads((RUN/'calls.json').read_text(encoding='utf-8-sig'));records=[]
routes={'character':'create_character','animation':'animate_character','image-pro':'create_image_pro','image-pixen':'create_image_pixen'}
translations={
 'awning-raider':'Pirata magro de colete laranja, calças escuras, bandana verde-azulada e alfanje curto; silhueta compacta e pixel art marítima detalhada.',
 'dock-bruiser':'Pirata portuário largo, camisa clara listrada, avental de couro e malho de madeira; silhueta forte e compacta.',
 'square-gunner':'Artilheiro pirata esguio, casaco ocre, chapéu naval azul, pequeno morteiro e bolsa vermelha de pólvora.',
 'captain-spark':'Capitão pirata imponente, casaco vinho com latão, faixa laranja, tricórnio escuro e martelo pesado de ferro.',
 'buildings':'Quatro construções originais em grade 2×2: casa de telhado laranja, taverna clara com toldo laranja, tenda vermelha/marfim e armazém verde; células128, vista de RPG superior, madeira, latão e tecidos, luz superior esquerda, sem personagens/texto.',
 'street':'Calçamento bege contínuo com pedras grandes gastas, juntas arenosas, baixo contraste, iluminação uniforme e pixel art nítida; sem objetos ou símbolos.'}
for c in calls:
    t='\n'.join(x['text'] for x in c['response']['content'] if x['type']=='text');failed=c['response'].get('isError',False)
    cost=0 if failed else int((re.search(r'(?:cost: |v3 \()(\d+) generations?',t)).group(1))
    records.append({'name':c['name'],'route':'MCP '+routes[c['kind']],'request':c['args'],'seed':'omitted','reported_usage':{'generations':cost},'queued':not failed,'receipt':t})
assert sum(x['reported_usage']['generations'] for x in records)==35
manifest={'scope':'Orange Town 21–30','approval':{'ceiling_generations':40,'extra_paid_attempts':False},'reported_usage':{'generations':35},'balance_delta_confirmed':True,'calls':records,'assembly':{'pixels':'Source pixels preserved; transparent padding and uniform-grid assembly only. No resizing or temporal trimming.','directions':['south','north','west','east'],'walking_frames':9,'reference_frames':1,'generated_frames':8,'idle_subject':[48,48],'walking_canvases':{'awning-raider':[64,64],'dock-bruiser':[68,68],'square-gunner':[68,68],'captain-spark':[68,68]},'runtime':'assets/orange-town/manifest.json','verification':'inspection.json; PNG sheet/source pixel equality; GIF loop/disposal and coalesced RGBA equality verified.'},'prompt_translations_pt':translations}
(RUN/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
recipe=[{'_comment_prompt':'Implementar Orange Town, ilha de caçada Nv.21–30, com cenários e quatro monstros originais em pixel art marítima, caminhadas cardeais e orçamento máximo de 40 gerações, sem tentativas extras.','_pixellab':{'paid_call_policy':'explicit_user_run_request_required','output_directory':'pixellab-pip-generations/orange-town','output_collision_policy':'create_unique'},'TASK':{'instruction':'Confirm explicit run approval and authenticated MCP access, then create an empty unique output directory. Stop before paid calls if unavailable.'}}]
for kind in ['image-pro','image-pixen','character']:
    for c in calls:
        if c['kind']!=kind or c['response'].get('isError'):continue
        name=c['name'];recipe.append({'_comment':name,'MCP '+routes[kind]:c['args']})
        if kind!='character':recipe.append({'TASK':{'instruction':'Poll get_image with the immediately returned job ID, download the original image, inspect the requested geometry and transparency. Do not retry automatically.','outputs':[name+'.png'],'verify':'Buildings are four distinct complete cells in a 2×2 transparent atlas; street is a readable native64 opaque ground surface, as applicable.'}})
        else:
            recipe.append({'TASK':{'instruction':'Poll get_character with the fresh returned ID until complete including pending preparation. Download all original rotations and inspect all directions. Inspect the first character before proceeding to the remaining characters.','outputs':[name+'/source.zip'],'verify':'Readable coherent 48px subject, stable identity, no missing or reversed directions; no resizing.'}})
            anim=next(x for x in calls if x['kind']=='animation' and x['name']==name+'-walk' and not x['response'].get('isError'))
            args=copy.deepcopy(anim['args']);args.pop('character_id')
            recipe.append({'TASK':{'instruction':'Call MCP animate_character on the fresh character just created, with character_id set to that returned ID and these exact remaining arguments: '+json.dumps(args,ensure_ascii=False)+'. Poll get_character until every direction completes. If slots are unavailable, wait and submit the same authorized call when capacity exists; do not change directions or create an extra animation. Download the updated original export.','outputs':[name+'/animated-source.zip'],'verify':'Four cardinal walking directions, original order, eight generated frames plus the reference if returned. Preserve actual padded canvas dimensions and all originals; inspect every frame.'}})
recipe.append({'TASK':{'instruction':'Assemble native transparent sheets with directions south,north,west,east as rows and original animation frames as columns. Preserve pixels and frame order; derive canvas sizes from returned images, anchor to reference feet. Split atlas quadrants without resizing. Create separate grid inspection copies and transparent looping GIFs per direction; verify disposal and coalesced frames against PNG originals. Integrate the approved art via assets/orange-town/manifest.json.','inputs':['buildings.png','street.png'],'outputs':['inspection.json'],'verify':'All four monsters load in-game, idle/walk transitions do not jump, frames remain intact, buildings are contained, all paths remain traversable; native sizes and transparency validated.'}})
(RUN/'orange-town.blueprint.json').write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Recorded 10 queued calls, one capacity rejection, 35 charged generations and portable recipe.')
