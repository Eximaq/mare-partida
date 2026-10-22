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

## PixelLab e custo

Foram feitas quatro chamadas de assets no MCP PixelArt Workbench: dois `split` e dois `edit`. O primeiro edit de superfícies doadoras está arquivado como alternativa, sem substituir corpo/roupa. O segundo produziu o vestuário ajustado. A descrição atual da ferramenta informa que essas operações são gratuitas para assinantes; ela não expõe uma medição de gerações por chamada. **Nenhuma chamada de geração paga foi feita nesta etapa.** Não há jobs pendentes, seeds novas ou tentativa automática de regenerar animações.

IDs, comandos literais, arquivos originais e saídas estão em `manifest.json` e `fit.blueprint.json`. O teto pago anterior não foi aumentado nem reutilizado.

## Validação

`assemble_review.py` verifica os oito frames retornados: igualdade da origem com os corpos anteriores, transparência intacta, mudanças restritas às superfícies declaradas, preservação das mãos/braços e cabeça, todas as camadas presentes, offsets sem corte e contato da espada em cada pose. Os GIFs são comparados em RGBA com os PNGs, sem quantização aproximada.

O teste Chromium compara a composição real do Canvas nas32 poses, testa32 combinações de camadas no impacto leste, antes/depois dos corpos, reprodução única, cache, enquadramento393px e isolamento do save. A regressão de combate injeta o pacote somente no navegador de teste e percorre o controlador/impacto real nas quatro direções; isso não habilita arte no produto.

Capturas de revisão ficam localmente em `docs/evidence-paper-doll/east-fit-*.png`, fora do Git. Resultados executados são registrados na entrega e no PR; estabilidade técnica não encerra a aprovação visual.

### Executado nesta continuação

- 46 suítes Node e nove testes Python de guias passaram.
- Build Pages, nova prévia Chromium e combate real com opt-in isolado passaram.
- Regressões da bancada/importação/fallback, estudo norte anterior e combate das sete classes passaram.
- Dawn passou localmente em cinco resoluções, com rotas, chefe, resgate e pixels do mapa. No CI, a primeira execução falhou ao esperar o aviso do chefe; a repetição foi cancelada durante a instalação do Chromium, antes do jogo. O limite do job subiu de10 para20min, preservando todos os testes. O resultado remoto do novo commit deve ser consultado no PR.
