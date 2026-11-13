# PR313: levantamento após revert314

Estado verificado via GitHub:313 mesclado em2026-11-13T02:31:59Z;314 reverteu313. main2667dbb4b8718fdf0fff702e45273e69c86dd016. PR307 permanece. Correções posteriores não foram publicadas nem mescladas.

## Falhas lidas nos logs

| Job | Falha | Causa / classificação |
|---|---|---|
| appearance96 | same direction must restore the same preview | Comparação usava sinal legado antes do carregamento HD. Além disso, preview dizia pronto ainda carregando: defeito real corrigido localmente; teste passa a aguardar fonte/direção/consumer. |
| lobby96 | loading stays transparent:2287!=0 | Teste bloqueava manifest96 antigo, não indexHD. Nova arte carregava corretamente. Teste precisa bloquear index atual e continuar provando zero legado e save intacto. |
| weapons96 | item0,frames[null],last:null | lastPose96 não é preenchido pelo HD e índices0/4/7 não descrevem suas timelines. Dano33ocorreu. Adaptação local do teste preserva dano/mortes/projéteis; ainda não validada em browser. |
| otherWeapons96 | item2,frames[null],last:null | Mesma instrumentação antiga; dano30ocorreu. Não comprova animação visual correta. |
| headgear96 | head visibility must change portrait | Combinação sem fonte agora mostra base sem equipamento por autorização. Capacete não aparece; exigir mudança é incompatível. Teste local distingue omissão diagnosticada de fonte suportada. |
| characterHud | body/helmet portraits:3!=4 | Mesma expectativa de capacete, com possível corrida assíncrona. Ainda requer ajuste/execução. |
| captain | canvas512!=256 | Backing nativo ampliou para512. Expectativa antiga; teste local mantém checks de overflow e exige pixels. Há risco de layout até captura revisada. |
| inventory | inventory-hd-browser15 timeout esperando alpha | Callback de fonte HD pronta não redesenhava painel inventário. Defeito real; callback corrigido localmente. Não confirmado em browser. |
| shared-lobby-browser | combat-targeted-browser15 timeout | Espera lastPose96.action attack-unarmed; caminhoHD não produz esse diagnóstico. Teste funcional ainda precisa migrar sem apagar prova de combate. |

## Limitações adicionais

Fallback autorizado mostra base sem arma, roupa e acessórios para combinações não suportadas, mas preserva equipamento e atributos salvos. Usa ataque desarmado visualmente. Cores/estilos não suportados podem usar aparência original. Não equivale a integrar todas combinações visuais. Carregamento inicial pode mostrar personagem vazio em vez do legado. Zoan/Visual Completo continuam separados.

No momento do levantamento:21checks sucesso,9falhas,2em execução(foundation,native-world). Teste autêntico+capturas não executados ainda; native-world está na suíte de fontes. Sucessos não anulam falhas de browser. Chromium local bloqueado por socket()/ptrace; alterações locais não são declaradas verificadas no jogo.
