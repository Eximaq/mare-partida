"""Record only the five explicitly authorized corrections and their receipts."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/bento-direction-fixes-20261018';PROD=ROOT/'pixellab-pip-generations/bento-combat-production-20261018'
def read(name):return json.loads((RUN/name).read_text(encoding='utf-8'))
def save(name,data):(RUN/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def main():
    keys=['west','north-idle','north-attack','north-skill','north-hurt'];calls=[]
    for key in keys:
        call=read(key+'-call.json');text='\n'.join(c.get('text','') for c in call['result']['content']);cost=re.search(r'cost: (\d+) generation',text);assert cost
        call.update({'reported_usage':{'generations':int(cost.group(1))},'seed':'omitted','completion':read(key+'-completed.json'),
                     'verification':read(key+'-verification.json'),'integration':read(key+'-integration.json')})
        calls.append(call)
    total=sum(c['reported_usage']['generations'] for c in calls);assert total==5
    review=json.loads((PROD/'visual-review.json').read_text(encoding='utf-8'));assert not review['rejected']
    runtime=read('runtime-verification.json');assert runtime['frames_checked']==36
    testpath=ROOT/'docs/evidence-bento-directions/results.json';tests=json.loads(testpath.read_text()) if testpath.exists() else []
    manifest={'status':'all_five_corrections_integrated','approvals':['Aprovo, porem ja faça um ajuste nos ataque e animaçao north','Aprovo as 5–8 gerações para corrigir o norte'],
      'calls':calls,'reported_usage':{'generations':total},'usage_basis':'Per-call PixelLab cost receipts. Account-wide balance delta was not attributed to this flow: additional remote north variants were visible during preflight.',
      'runtime_verification':runtime,'browser_tests':tests,'pending_jobs':False,'new_paid_attempts_beyond_approval':False,
      'unchanged':'Other direction rows and the entire death sheet were preserved. Source frames and previous versions remain intact.'}
    save('manifest.json',manifest)
    prompt='Aprovo, porem ja faça um ajuste nos ataque e animaçao north, as animação de ataque principalmente nao está voltada ao direcionamento do boneco, ele ataca com as mao pras costa como tivesse virado a south'
    bp=[{'_comment_prompt':prompt,'_pixellab':{'output_directory':'pixellab-pip-generations/bento-direction-fixes-20261018','output_collision_policy':'create_unique','paid_call_policy':'explicit_user_run_request_required'},
      'TASK':{'instruction':'Verify west-correction and four-north-correction approvals. Preserve an existing-runtime checkpoint and copy the original west/north 64x64 guard PNGs unchanged. Confirm authenticated MCP.'}}]
    for call in calls:bp.append({'MCP animate_character':call['args']})
    bp.append({'TASK':{'instruction':'Poll each returned group to completion, then download exactly 8 west, 4 north idle, 8 north attack, 12 north skill and 4 north hurt frames. Preserve order and every original pixel; assemble exact-palette GIF previews and inspection grids. Inspect facing, forearm occlusion and recovery before use. Replace only the corresponding 84x84 sheet rows with centered transparent padding. Preserve the old versions. Keep death unchanged. Set corrected north skill impact frame to 3 while other directions retain their previous timing. Verify all 36 replacement frames, one-shot behavior, death/respawn and faction/class scope.'}})
    save('bento-direction-fixes.blueprint.json',bp)
    report='''# Bento — correções de direção e oclusão

O ataque para a esquerda e as quatro animações solicitadas de costas foram substituídos e integrados. A aparência de Bento e da espada foi preservada. As mãos e antebraços não cruzam mais a superfície visível das costas; na vista norte, ficam à frente do torso, ocultos pelo corpo. A lâmina fica bastante encoberta durante o golpe norte por essa perspectiva — o movimento dos ombros permanece visível. Não foi mantida a pose incorreta com as mãos sobre as costas.

## Resultado

- Ataque esquerda: oito frames, mantendo a vista lateral até a recuperação.
- Guarda norte: quatro frames, costas visíveis e antebraços ocultos.
- Ataque norte: oito frames, mesma orientação e retorno à guarda.
- Corte de Maré norte: 12 frames, efeito marítimo turquesa e braços sem cruzar as costas; o efeito varre o lado do personagem.
- Hurt norte: quatro frames, reação discreta e recuperação da guarda.

As cinco direções/ações foram reativadas: não há mais combinação substituída pela guarda estática em razão dessas falhas. O fallback de carregamento continua disponível. A queda permanece byte a byte idêntica à versão anterior. Não foram gerados outros personagens, classes ou facções.

![Ataque de costas corrigido](../pixellab-pip-generations/bento-direction-fixes-20261018/north-attack-preview.gif)

![Corte de Maré de costas corrigido](../pixellab-pip-generations/bento-direction-fixes-20261018/north-skill-preview.gif)

## Montagem e verificação

36 frames novos mantidos na ordem original. Tamanhos efetivamente retornados: oeste 68×68; guarda norte 68×68; ataque/hurt norte 76×68; Corte norte 80×68. Nenhum foi redimensionado para entrega, repintado, espelhado, invertido, duplicado ou cortado. Só foi acrescentado padding para as células 84×84 já usadas pelo jogo. Os grids ampliados são auxiliares de inspeção separados.

Cada recorte da folha ativa foi comparado ao PNG original, incluindo alpha. As outras linhas das folhas permaneceram byte a byte idênticas durante cada substituição. Os GIFs foram coalescidos e comparados nas áreas visíveis, com paleta exata, transparência, disposal 2 e repetição apenas de inspeção.

O pivô [42,65] e a altura de referência de 46 px foram preservados. O impacto do novo Corte norte ocorre no frame 3, acompanhando o novo efeito; as outras direções conservam o frame 5. A máquina de estados aceita esse evento por direção. Testes unitários verificam os dois tempos e o impacto único.

'''
    if tests:report+=f'{len(tests)} cenários de navegador aprovados: combate real, morte com pose final/renascimento e isolamento de facção/classe. Evidências em `docs/evidence-bento-directions/`. O teste de morte foi estabilizado pausando a auto-caçada pelo controle real quando um inimigo se aproxima, evitando vitórias e cura por nível que impediam uma derrota na execução aleatória anterior.\n\n'
    report+='''## Custos e referências

As cinco respostas de criação informaram **5 gerações**: 1 pela esquerda e 1 por cada correção norte. O lote norte ficou abaixo das 5–8 estimadas. Pelas respostas das chamadas desta etapa, são 4 do piloto + 23 da produção + 5 das correções = **32 gerações informadas**. Não foi usada a variação do saldo global para atribuir custo a este fluxo, pois o getter também expôs outras versões remotas de norte durante a conferência. As versões adicionais foram apenas baixadas e inspecionadas; nenhuma delas foi gerada ou selecionada por este fluxo.

Foram usadas cinco chamadas MCP `animate_character`, `mode: v3`, `keep_first_frame: false`, no personagem armado `1c0b995e-67da-4baf-b6e7-f210bd709ef4`. Cada chamada gerou somente a direção corrigida. A guarda norte usou apenas `custom_start_frame_base64`; as outras quatro usaram início e fim iguais à guarda da direção, em PNG 64×64. Nenhum seed foi enviado.

Checkpoint: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-bento-direction-fixes-20261018`. Os originais e as versões anteriores continuam preservados; nada foi apagado ou sobrescrito remotamente. Não há job pendente nem retry adicional executado.

## Entradas textuais exatas

'''
    translations=['Golpear para a esquerda mantendo essa direção durante todo o clipe, recuperar exatamente a guarda fornecida e manter a espada na mesma mão.',
      'Respirar em guarda de costas, manter antebraços à frente do peito e ocultos pelo torso, pés apoiados e recuperar a guarda.',
      'Golpear para o norte, afastando-se do observador, com costas visíveis, antebraços à frente do peito ocultos pelo torso e lâmina além do ombro distante; recuperar a guarda.',
      'Preparar Corte de Maré para o norte, com arco turquesa além do ombro distante, mantendo costas visíveis, antebraços ocultos pelo torso e recuperando a guarda.',
      'Reagir ao dano de costas e recuperar a guarda, mantendo mãos e antebraços à frente do torso e ocultos do observador.']
    for call,tr in zip(calls,translations):report+='`'+call['args']['action_description']+'`\n\nTradução: '+tr+'\n\n'
    report+='[Galeria ao vivo](http://127.0.0.1:8123/pixellab-pip-generations/bento-combat-production-20261018/preview.html) · [Manifesto](../pixellab-pip-generations/bento-direction-fixes-20261018/manifest.json) · [Blueprint](../pixellab-pip-generations/bento-direction-fixes-20261018/bento-direction-fixes.blueprint.json)\n'
    (ROOT/'docs/BENTO-CORRECOES-DIRECIONAIS.md').write_text(report,encoding='utf-8');print('Cinco correções documentadas; 36 frames exatos; 5 gerações informadas pelas chamadas.')
if __name__=='__main__':main()
