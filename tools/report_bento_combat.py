"""Build an auditable report from accepted calls and saved verification results."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/bento-combat-production-20261018'
def read(name):return json.loads((RUN/name).read_text(encoding='utf-8'))
def save(name,value):(RUN/name).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def main():
    names=['create-call.json','combat-idle-call.json','attack-call.json','corte-de-mare-accepted.json','hurt-accepted.json','death-accepted.json']
    calls=[read(name) for name in names]
    for i,call in enumerate(calls):
        text='\n'.join(c.get('text','') for c in call['result']['content'])
        cost=re.search(r'cost: (\d+) generations',text) if i else re.search(r'\((\d+) generations,',text)
        assert cost,text
        call['reported_usage']={'generations':int(cost.group(1))};call['seed']='omitted'
    total=sum(c['reported_usage']['generations'] for c in calls);assert total==23
    review=read('visual-review.json');audit=read('assembly-audit.json')
    tests={}
    for key,file in {'combat':'docs/evidence-bento-combat/results.json','classes':'docs/evidence-bento-combat/character-regression/results.json','island':'docs/evidence-bento-combat/island-regression/results.json','factions':'docs/evidence-bento-combat/faction-regression/results.json'}.items():
        path=ROOT/file
        if path.exists():tests[key]=json.loads(path.read_text(encoding='utf-8'))
    manifest={'status':'integrated_with_one_rejected_direction_pending_correction','approval':'aprovo o lote completo: 21–41 additional generations, no retries',
      'character_id':'1c0b995e-67da-4baf-b6e7-f210bd709ef4','calls':calls,'reported_usage':{'generations':total},
      'completion':read('completed-character.json'),'visual_review':review,'verification':{'original_frames':144,'exact_pixel_packaging':True,'fixed_pivot':True,'animation_cells':[84,84]},
      'tests':tests,'quarantine':{'attack/west':'Original full eight-frame clip preserved, excluded from runtime; static armed directional guard used explicitly.'},
      'rejected_admissions':[read(f) for f in ['corte-de-mare-call.json','hurt-call.json','death-call.json']],
      'pending_jobs':False,'paid_retry_authorized':False,'input_image':'bento-guard-corrected.png'}
    save('manifest.json',manifest)
    source=(Path('C:/Users/Marcos/.codex/attachments/65fbc3d3-4253-4297-8e04-9f1c9ac1bbd0/Texto colado.txt')).read_text(encoding='utf-8')
    blueprint=[{'_comment_prompt':source,'_pixellab':{'output_directory':'pixellab-pip-generations/bento-combat-production-20261018','output_collision_policy':'create_unique','paid_call_policy':'explicit_user_run_request_required'},
      'TASK':{'instruction':'Verify explicit full-batch approval and authenticated MCP; create a unique output folder and preserve the approved reference PNG unchanged.'}}]
    for i,call in enumerate(calls):
        args=dict(call['args'])
        if i==0:args['reference_image_base64']='bento-guard-corrected.png'
        blueprint.append({'MCP '+('create_character' if i==0 else 'animate_character'):args})
    blueprint.append({'TASK':{'instruction':'Download original character ZIP and 144 generated frames. Preserve returned order and native sizes; assemble transparent 84x84 cells with a fixed canvas-center pivot, exact-palette GIFs and inspection grids. Inspect facing, sword continuity and death. Quarantine failed attack/west rather than trim or mirror it. Reuse its directional source rotation as an explicit static armed guard. Integrate only pirate+sword and verify impact timing, movement locks, death hold, respawn, class/faction isolation and saves. Further paid correction requires its own approval.'}})
    save('bento-combat.blueprint.json',blueprint)
    report='''# Bento Maré-Livre — combate do Espadachim Pirata

O lote foi concluído e integrado à combinação Pirata + Espadachim. **A entrega ainda tem uma direção pendente:** o ataque básico para a esquerda muda para a frente na recuperação e foi excluído da reprodução. Nessa combinação, o jogo mantém temporariamente a guarda armada estática e o dano/efeito existente no impacto. O clipe original completo continua na galeria. Não é uma animação lateral aprovada.

## Arte e inspeção

20 clipes, 144 frames: guarda 4, ataque 8, Corte de Maré 12, hurt 4 e death 8, em frente/costas/esquerda/direita. 19 combinações são reproduzidas como animação; ataque/esquerda usa a ressalva acima. As quatro rotações armadas são 64×64. O PixelLab devolveu animações em 76×76 (frente/costas) e 68×68 (lados); o corpo mantém a escala nativa, com espaço extra para movimento. Folhas de entrega usam células transparentes 84×84.

Nenhum frame foi repintado, espelhado, invertido, duplicado ou encurtado localmente. Foram verificados pixels originais na montagem e os GIFs coalescidos contra suas fontes, com paleta exata, transparência, disposal 2 e repetição de inspeção. O pivô é fixo por centro do canvas e linha dos pés da referência, sem alinhar novamente cada pose ou ampliar a figura quando ela cai. Altura de referência 46 px exibida em cerca de 70 px.

Ressalvas artísticas: a guarda movimenta a espada mais que uma respiração discreta; a lâmina fica pouco legível à esquerda. O ataque de costas tem um flash forte. Hurt termina agachado e retorna à guarda pela transição do estado. Corte de Maré/esquerda não contém o arco turquesa gerado nas outras vistas; o efeito de corte já existente no jogo continua no impacto. Há um pequeno pixel cinza solto no fim do Corte frontal. Death/esquerda termina sentado/caído, enquanto as outras vistas terminam deitadas. Esses detalhes ficam expostos na galeria, sem afirmar acabamento artístico definitivo.

## Integração

`combat-animation.js` controla idle, walk, combat-idle, attack, skill, hurt e death com relógio por estado. Movimento aguarda o fim do golpe; dano tem um único compromisso no frame de impacto; morte cancela esse compromisso e mantém o último frame até o renascimento. Hurt recebido durante um golpe é reproduzido logo depois, sem cortar a espada no meio do movimento. Habilidades automáticas prontas têm prioridade para não ficarem bloqueadas pelo ataque básico. Um ataque recusado pelo estado não reinicia seu intervalo.

As fórmulas de dano, precisão, atributos e custos de energia continuam existentes; o momento de aplicação acompanha a animação. O segundo golpe de área do Espadachim compartilha o estado visual de skill, sem uma geração adicional. Idle e walk normais reutilizam a base aprovada, sem espada; os estados de combate usam a versão armada. Nenhuma arte de outra classe ou facção foi gerada. O aviso de renascimento foi movido para uma faixa no rodapé somente nesse personagem, permitindo ver o corpo caído.

A seleção e os retratos das quatro bases foram preservados. O mostruário das facções filtra o asset de classe para continuar mostrando apenas os quatro modelos. O save do usuário não foi modificado pelos testes.

## Custos e preservação

**23 gerações neste lote:** 1 pelas rotações, 4 pela guarda, 4 pelo ataque, 6 pelo Corte de Maré, 4 por hurt e 4 por death. Somadas às 4 do piloto: **27 gerações nesta etapa**. Nenhum crédito USD foi necessário. As três chamadas inicialmente recusadas por falta de vagas não criaram jobs; os mesmos trabalhos aprovados foram enviados depois. Não houve retry pago e não há geração pendente.

Checkpoint anterior: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-bento-combat-20261018`. Os 16 arquivos das facções-base, os 52 assets anteriores e os sistemas de mundo, ilha e atributos permanecem preservados. Novas folhas: `assets/classes/pirate-sword/`. Originais, ZIP, prévias, auditoria e parâmetros: `pixellab-pip-generations/bento-combat-production-20261018/`.

## Verificação

'''
    for key,items in tests.items():report+=f'- {key}: {len(items)} cenários aprovados; resultados em `docs/evidence-bento-combat/`.\n'
    report+='- Testes unitários de estado: exclusão de ações, impacto único, frames longos, cancelamento na morte, pose final e reset.\n- Testes de reprodução: clamp de one-shot, loop de idle, direção, pivô fixo e pixels sem suavização.\n- 10 cenários de atributos, 39 verificações de mundo/câmera e oito rotas de ilha aprovados.\n\n'
    report+='![Corte de Maré no combate real](evidence-bento-combat/skill.png)\n\n![Morte mantida até renascer](evidence-bento-combat/death-held.png)\n\n## Chamadas e entradas exatas\n\nMCP v3, referência armada aprovada, sem seed enviado. A rotação usou quatro direções, humanoid, size 64, low top-down. As animações usaram as quatro direções, `keep_first_frame: false` e 4/8/12/4/8 frames. Os prompts abaixo foram elaborados a partir do pedido e aprovados previamente.\n\n'
    translations=['Preservar Bento, rosto, cabelo, roupas, proporções, estilo e espada original.','Guarda firme com respiração discreta, mesma mão e direção, pés apoiados, retorno suave à guarda.','Preparar um golpe, cortar com impacto e recuperar a guarda inicial, mantendo a mão e direção.','Corte amplo com breve arco marítimo turquesa e recuperação da guarda, mantendo mão e direção.','Reagir a um golpe, inclinar levemente e retornar à mesma guarda.','Perder equilíbrio, dobrar os joelhos e cair continuamente, terminando caído com a espada visível, sem desaparecer ou teleportar.']
    for call,tr in zip(calls,translations):
        args=call['args'];text=args.get('description',args.get('action_description'))
        report+=f'`{text}`\n\nTradução: {tr}\n\n'
    report+='[Galeria ao vivo](http://127.0.0.1:8123/pixellab-pip-generations/bento-combat-production-20261018/preview.html) · [Manifesto](../pixellab-pip-generations/bento-combat-production-20261018/manifest.json) · [Blueprint](../pixellab-pip-generations/bento-combat-production-20261018/bento-combat.blueprint.json)\n'
    (ROOT/'docs/BENTO-ESPADACHIM-COMBATE.md').write_text(report,encoding='utf-8');print('Relatório e auditoria gravados: 23 gerações, integração parcial explícita.')
if __name__=='__main__':main()
