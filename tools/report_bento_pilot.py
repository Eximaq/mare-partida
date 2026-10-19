"""Record the completed four-call pilot and its known visual limitations."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'pixellab-pip-generations/bento-combat-pilot-20261018'
def read(name):return json.loads((RUN/name).read_text(encoding='utf-8'))
def save(name,data):(RUN/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
calls=[read(f) for f in ['edit-call.json','retry-call.json','combat-idle-call.json','attack-call.json']]
for call,name in zip(calls,['edit-result.json','retry-result.json','combat-idle-result.json','attack-result.json']):call['completion']=read(name)
manifest={'status':'pilot_completed_awaiting_visual_approval','approvals':['Aprovo o teste','autorizo: one extra 1-generation edit'],
 'calls':calls,'usage':{'generations':4,'credits_usd':0,'balance_before':1667,'balance_after':1663,'per_call_generations':[1,1,1,1]},
 'verification':read('animation-verification.json'),
 'art_review':{'first_edit':'Rejected: east-facing. Alpha bounds verify no clipping.',
 'corrected_edit':'South-facing; original identity readable; used for both animations.',
 'idle':'South-facing, sword lowers rather than staying in stable combat guard. Loop needs user assessment.',
 'attack':'Preparation, slash and impact readable; final sword position differs from initial guard. Visible jump on loop, recovery needs refinement.',
 'echo':'Returned frame 0 changes 87 visible pixels in idle and 67 in attack relative to input. All returned PNGs kept unchanged.',
 'verdict':'Reviewable pilot, not approved for production or gameplay integration.'},
 'assembly':'Transparent exact-palette GIFs and sheets, original frame order, no trimming, synthesis or mirroring.',
 'remaining_estimate':{'generations':[19,37],'authorized':False,'scope':'One armed directional reference rotation and 18 clips: 3 idle + 3 attack + 4 special + 4 hurt + 4 death. Roughly 1–2 per clip, canvas growth can increase cost. Excludes pilot corrections, retries, armed walk generation and Pro escalation.'},
 'game_integration':False,'original_assets_unchanged':True}
save('manifest.json',manifest)
bp=read('bento-combat-pilot.blueprint.json')[:2]
bp.extend([{'TASK':{'instruction':'Preserve the first rejected edit. Explicit extra-retry approval is required to continue.'}},
 {'MCP edit_image_pixen':calls[1]['args']},
 {'TASK':{'instruction':'Download the corrected edit unchanged as bento-guard-corrected.png and inspect facing and identity.'}}])
for call in calls[2:]:
 args=dict(call['args']);args['first_frame_url']='bento-guard-corrected.png'
 bp.append({'MCP animate_image':args})
bp.append({'TASK':{'instruction':'Download all 5 idle and 7 attack PNGs unchanged. Preserve the returned first frame even if PixelLab changed visible pixels. Assemble same-order transparent sheets and exact-palette looping GIF previews; verify fidelity and disposal. Ask for visual approval before integration or further paid work.'}})
save('bento-combat-pilot.blueprint.json',bp)
report='''# Bento Espadachim — teste frontal para avaliação

Foram produzidas duas prévias PixelLab, sem ativar as novas artes no combate. Os sprites-base e o save continuam preservados. Checkpoint: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-bento-combat-20261018`.

## Resultado visual

A primeira edição virou Bento para a direita e foi rejeitada. A correção extra autorizada manteve a frente e acrescentou a espada. O idle tem cinco frames e o ataque sete: a API devolve um frame inicial além dos quatro/seis gerados. Todos foram mantidos em ordem.

O idle abaixa a espada durante a respiração, em vez de manter uma guarda firme. O ataque mostra preparação, corte e impacto, mas termina com a espada no lado oposto da pose inicial, causando um salto ao repetir. A recuperação precisa de refinamento antes de considerar o piloto pronto para produção. O rosto, a faixa, o colete carmim e a calça azul permanecem reconhecíveis.

O frame inicial retornado também não é uma cópia exata da referência: o PixelLab mudou 87 pixels visíveis no idle e 67 no ataque. Esses resultados foram preservados, sem substituir, cortar ou repintar frames. As folhas mantêm 64×64; o original 48×48 recebeu apenas 8 px de margem transparente em cada lado antes da edição.

![Idle frontal](../pixellab-pip-generations/bento-combat-pilot-20261018/combat-idle-preview.gif)

![Ataque frontal](../pixellab-pip-generations/bento-combat-pilot-20261018/attack-preview.gif)

## Verificação e custos

12 PNGs decodificados e 12 frames de GIF comparados pixel a pixel nas áreas visíveis. Transparência, ordem, paleta sem quantização, disposal 2 e loop 0 verificados. As grades são auxiliares de inspeção separados; os PNGs originais não foram alterados. Nenhum frame toca a borda do canvas. Não houve mudança no código de combate, por isso não foram repetidas regressões do jogo para este piloto de arte.

Consumo confirmado: **4 gerações**, uma por chamada. Saldo 1667 → 1663. Créditos USD: **0**. Não há geração pendente. Manifesto, blueprint portátil, resultados, PNGs, GIFs e folhas ficam em `pixellab-pip-generations/bento-combat-pilot-20261018/`.

Para as demais direções e animações, estimativa preliminar de **19–37 gerações**: uma rotação da referência armada e 18 clipes direcionais (3 idle, 3 ataque, 4 Corte de Maré, 4 hurt, 4 death), estimados em 1–2 por clipe conforme o canvas. Essa estimativa exclui correções do piloto, retries, caminhada armada e escalada Pro. Não é autorização para gastar: requer novo plano concreto e aprovação depois da avaliação visual.

## Rota e entradas exatas

MCP `edit_image_pixen` (Pixen) seguido de `animate_image` (v3). Todas as chamadas usaram `no_background: true`; nenhum seed ou last_frame foi enviado. As edições usaram a mesma frente original com padding, `width: 64`, `height: 64`. As duas animações partiram do PNG da edição corrigida, usando `first_frame_url`.

'''
translations=[
 'Preservar rosto, cabelo, roupa, proporções, paleta e sombras; acrescentar espada de aço com guarda de bronze envelhecido e cabo de tecido, em guarda relaxada, mantendo a frente e o corpo inteiro.',
 'Manter exatamente a pose frontal, rosto e torso para o observador, ambos os olhos visíveis e ombros simétricos; preservar identidade e estilo, acrescentar espada e centralizar.',
 'Respirar discretamente em guarda, segurar a espada firme, manter frente, pés apoiados e corpo no lugar.',
 'Preparar um golpe de espada, executar o corte com impacto legível e recuperar a guarda inicial; manter frente e posição.']
for i,(call,tr) in enumerate(zip(calls,translations),1):
 args=call['args'];prompt=args.get('description',args.get('action'))
 report+=f'{i}. `{prompt}`\n\n   Tradução: {tr}\n\n'
report+='[Plano visual](PLANO-BENTO-ESPADACHIM.md) · [Manifesto](../pixellab-pip-generations/bento-combat-pilot-20261018/manifest.json) · [Blueprint](../pixellab-pip-generations/bento-combat-pilot-20261018/bento-combat-pilot.blueprint.json)\n'
(ROOT/'docs/BENTO-ESPADACHIM-PILOTO.md').write_text(report,encoding='utf-8')
print('Manifesto, blueprint e relatório concluídos; 4 gerações contabilizadas.')
if __name__=='__main__':pass
