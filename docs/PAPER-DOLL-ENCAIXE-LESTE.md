# Paper Doll — encaixe leste (22/10/2026)

[Comparação interativa](../pixellab-pip-generations/paper-doll-east-fit-20261022/preview.html) · [GIF leste](../pixellab-pip-generations/paper-doll-east-fit-20261022/modular-east.gif) · [Auditoria](../pixellab-pip-generations/paper-doll-east-fit-20261022/fit-audit.json) · [Receita exata](../pixellab-pip-generations/paper-doll-east-fit-20261022/fit.blueprint.json).

## Estado de revisão

O novo pacote permite inspecionar **32 poses de ataque em quatro direções**, com seis camadas separadas: corpo, calças, botas, roupa, cabelo e espada. Frente/norte/oeste conservam os pixels do pacote anterior. O leste agora tem um candidato de vestuário ajustado ao corpo, sem depender da reconstrução Pro Flash reprovada.

**Isso não é aprovação artística nem ativação do personagem modular no jogo.** O colete e as botas leste são mais simples que as peças originais e precisam de harmonização entre vistas. O campo `modular_fit_gate_passed:false` registra que o candidato continua em calibração artística; cobertura de arquivos não significa aceite. Todas as peças usam `approved:false`, `reviewOnly:true` e `productionEnabled:false`. O renderizador normal continua usando os personagens existentes.

## Como as peças foram ajustadas

O Workbench do PixelLab recebeu o strip nativo de oito corpos leste já retocados, sem redimensionamento. Em uma edição de50 operações, máscaras específicas de cada pose delimitaram o torso e excluíram os braços/mãos. Mapeamentos de cores criaram linho/colete carmesim sobre essa superfície, shorts azuis e botas sobre os pés existentes. A geometria, transparência, cabeça, movimento e apoio dos pés foram preservados. As cores visíveis foram produzidas no PixelLab; o script local somente verifica, seleciona, separa e compõe os pixels retornados.

Não se desenhou roupa no Pillow, não se duplicou o corpo de uma pose em outra e não se simulou o ataque com uma imagem estática. Os oito corpos continuam sendo frames distintos da animação real. As roupas acompanham suas próprias superfícies, inclusive no frame de impacto.

O cabelo usa pixels visíveis do Bento correspondente; na pose6, encoberta pelo clarão original, somente a superfície estacionária de cabelo da pose5 é reutilizada. A espada dessa pose usa a lâmina/empunhadura horizontal da pose7, com encaixe próprio na mão atual. Isso é reaproveitamento localizado de uma peça, não recuperação de pixels ocultos nem uma nova animação generativa. As outras lâminas vêm das respectivas poses reais do Bento. Foram preservados os originais e o estudo alternativo de superfícies doadoras.

Uma seleção baseada apenas no dourado havia descartado o trecho preto do cabo horizontal. O seletor agora inclui explicitamente seus pixels originais. Os offsets da espada são por pose, inteiros e sem rotação/interpolação. Distâncias de contato são evidência geométrica auxiliar; não aprovam a qualidade da arte.

## Contrato e compatibilidade

- Fontes nativas64×64; composição84×84, pivô42/65, oito frames a12FPS, sem alterar o frame legado de impacto3.
- Corpo/roupa/calças/botas leste: padding10/9. Cabelo/arma:10/10, com compensação da arma declarada em `poseOverrides`.
- Norte preserva os cinco frames de espada realmente encoberta e sua profundidade. As três linhas anteriores das seis folhas são idênticas em RGBA.
- O pacote é exclusivo de inspeção. Não modifica catálogo de produção, saves, sete classes, facções, física, câmera, equipamentos, Haki, Zoan ou eventos de combate.
- Idle/Walk e as cinco outras categorias de ataque não foram regenerados. Continuidade entre ações e acabamento das quatro vistas continuam pendentes antes de qualquer ativação.

## Bancada de calibração

[Abrir o pacote diretamente na bancada](../tools/paper-doll-inspector/index.html?pack=bento-east-fit). A ferramenta aceita agora um rig com somente a ação de ataque declarada, validando-a contra o contrato existente. As ações ausentes usam linhas de tempo canônicas para exibir o fallback; nenhuma cobertura fictícia é exportada.

O painel **Ajustar camada por frame** edita somente offsetX, offsetY e profundidade da peça/direção/pose selecionada. O PNG permanece intacto. Os ajustes podem ser restaurados ou exportados como manifesto de revisão, sem URLs blob e sem aprovação automática. A edição de sockets das armas rígidas continua disponível no painel anterior. Isso permite calibrar o novo vestuário e espada sem consumir créditos a cada ajuste.

## PixelLab e custo

Foram feitas quatro chamadas de assets no MCP PixelArt Workbench: dois `split` e dois `edit`. O primeiro edit de superfícies doadoras está arquivado como alternativa, sem substituir corpo/roupa. O segundo produziu o vestuário ajustado. A descrição atual da ferramenta informa que essas operações são gratuitas para assinantes; ela não expõe uma medição de gerações por chamada. **Nenhuma chamada de geração paga foi feita nesta etapa.** Não há jobs pendentes, seeds novas ou tentativa automática de regenerar animações.

IDs, comandos literais, arquivos originais e saídas estão em `manifest.json` e `fit.blueprint.json`. O teto pago anterior não foi aumentado nem reutilizado.

## Validação

`assemble_review.py` verifica os oito frames retornados: igualdade da origem com os corpos anteriores, transparência intacta, mudanças restritas às superfícies declaradas, preservação das mãos/braços e cabeça, todas as camadas presentes, offsets sem corte e contato da espada em cada pose. Os GIFs são comparados em RGBA com os PNGs, sem quantização aproximada.

O teste Chromium compara a composição real do Canvas nas32 poses, testa32 combinações de camadas no impacto leste, antes/depois dos corpos, reprodução única, cache, enquadramento393px e isolamento do save. A regressão de combate injeta o pacote somente no navegador de teste e percorre o controlador/impacto real nas quatro direções; isso não habilita arte no produto.

Capturas de revisão ficam localmente em `docs/evidence-paper-doll/east-fit-*.png`, fora do Git. Resultados executados são registrados na entrega e no PR; estabilidade técnica não encerra a aprovação visual.

### Executado nesta continuação

- 47 suítes Node e nove testes Python de guias passaram.
- Build Pages, nova prévia Chromium e combate real com opt-in isolado passaram.
- Regressões da bancada/importação/fallback, estudo norte anterior e combate das sete classes passaram.
- A nova edição de folhas passou no Chromium: offsets por pose, valores inválidos, exportação/reimportação, reset, contratos parciais, hashes dos PNGs, responsividade e save. A regressão antiga dos sockets também passou.
- Dawn passou localmente em cinco resoluções, com rotas, chefe, resgate e pixels do mapa. O teste agora se aproxima do chefe por um ponto navegável com linha de visão, usando clique e movimentação reais: chegar à âncora do setor não garante alcance contra um spawn aleatório próximo da casa. Nenhum mapa, colisão ou comportamento de monstro foi modificado. O timeout do CI subiu de10 para20min para comportar a instalação fria do Chromium; todos os testes foram mantidos. O resultado remoto do novo commit deve ser consultado no PR.

### Integração com o colaborador

A branch incorpora `origin/main` em2e7fe74, incluindo os PRs58/59 de lobby e mapas/monstros. O merge foi feito somente na branch de trabalho, preservando esses arquivos e a correção de versionamento das imagens locais. Build,47 suítes Node,9 testes de guias e a validação de ataque/bancada/Dawn foram repetidos sobre essa base integrada. Nenhum merge deste PR foi feito na main.


## Ensaio de continuidade na bancada

O seletor **Ensaio → Repouso → Caminhada → Ataque → Repouso** percorre um ciclo completo de cada ação usando seus frames/FPS reais e o mesmo pivô. O último repouso encerra o ensaio; Reproduzir inicia uma nova sequência. Pausar conserva a pose, e selecionar uma ação ou arrastar o frame cancela a sequência corrente. Alterações continuam restritas à bancada.

Na reprodução de uma ação isolada, o campo `loop` do contrato é respeitado: repouso e caminhada repetem; ataque para no último frame. Antes, a bancada repetia todas as ações indiscriminadamente. O controlador de combate não foi alterado.

O pacote `bento-east-fit` ainda contém apenas ataque. Por isso o ensaio mostra o fallback completo em Idle/Walk e as camadas em revisão durante Attack, com aviso visível a cada etapa. Essa troca de aparência é uma **pendência de arte**, não continuidade modular aprovada. Não foram combinados automaticamente os pilotos antigos com anatomia diferente, nem criados novos PNGs ou consumidos créditos.

Validação desta continuação: nove suítes Node Paper Doll, build Pages, teste Chromium de continuidade e regressão da edição/exportação de camadas passaram. O novo teste percorre as quatro vistas, verifica ataque único/reinício explícito, pausa, cancelamento, loop de caminhada, fallback das ações ausentes, viewport de393px e save intacto. Capturas locais `continuity-1366.png` e `continuity-393.png` foram inspecionadas. Os quatro checks remotos do commit anterior6843c89 passaram; o novo commit exige sua própria execução do CI.
