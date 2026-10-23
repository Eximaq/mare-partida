# Paper Doll — cabelo curto contínuo

[Abrir estudo de corpo e cabelo](../tools/paper-doll-inspector/index.html?pack=hair-continuity).

## Resultado e limites

As80 poses corporais agora podem ser inspecionadas com o cabelo curto existente nas três ações. Idle/Walk conservam integralmente suas folhas originais. Attack usa quatro superfícies direcionais do cabelo Idle, encaixadas separadamente nas32 poses do ataque. A bandana do Bento presente no estudo anterior não integra este pacote; os originais continuam preservados.

Não é uma nova animação de corpo nem uma geração de cabelo. É reutilização de uma peça de aparência sobre cabeças animadas: cada direção tem seu próprio cabelo, movido por offsets inteiros conforme a posição real da cabeça. Não há escala, rotação, espelhamento, deformação, recoloração ou pintura. O cabelo não tem movimento secundário independente durante o ataque. Essa limitação é explícita; a animação corporal real permanece intacta.

O pacote é parcial e exclusivo de inspeção. Roupa, calçados, arma e acabamento das transições continuam pendentes. O personagem completo ainda não foi aprovado nem ativado no jogo. A comparação de pixels verifica integridade, não aprovação artística.

## Fonte e encaixe

- Corpo: três PNGs byte a byte do estudo `paper-doll-body-continuity-20261022`.
- Cabelo Idle/Walk: PNGs byte a byte de `paper-doll-walk-profiles-20261021`.
- Cabelo Attack: frame0 Idle de cada direção, mantendo todos os pixels visíveis e transparência; deslocamento calculado entre os envelopes superiores das cabeças nativas.
- Todas as cabeças comparadas têm a mesma largura de10px no envelope de quatro linhas. O script exige essa correspondência e rejeita recorte de cabelo ou ausência de sobreposição com a cabeça.
- Cada translação e origem está registrada em `source-audit.json`; o script reproduz a montagem sem chamadas externas. O atlas de32 poses foi inspecionado para verificar cobertura do crânio, direção, contorno e sobreposição com rosto/mãos.

Os pixels provêm dos assets PixelLab já produzidos. **Nenhuma chamada PixelLab ou geração paga foi realizada nesta etapa.** Não há nova receita remota ou job pendente.

## Bancada

O escopo `body-hair-review` exige exatamente corpo/cabelo, as duas peças e referências correspondentes, sem equipamentos, com produção e aprovação completa explicitamente bloqueadas. O escopo anterior de corpo somente continua exigindo apenas corpo. Pacotes comuns continuam exigindo o conjunto padrão completo; nenhum requisito do compositor de produção foi relaxado.

A bancada mostra `Corpo e cabelo · Sem vestuário`, distingue o estado `hair-study`, desativa controles das peças ausentes e permite ocultar o cabelo para conferir o corpo original. Links no topo alternam entre os estudos do corpo, corpo/cabelo e ataque vestido.

## Validação

O teste Chromium compara80 poses com e sem cabelo (160 comparações RGBA independentes), percorre as três ações, verifica enquadramento desktop/celular e save intacto. A auditoria verifica os hashes das fontes e reproduz as32 translações de cabelo do ataque. Capturas locais ficam em `docs/evidence-paper-doll/hair-continuity-*.png`; não são versionadas.

O próximo trabalho visual é ajustar o vestuário ao corpo comum, preservando as mãos e a articulação dos braços. Os coletes azul/carmesim dos pilotos anteriores não são promovidos automaticamente como um visual contínuo.

Validação executada: nove suítes Node Paper Doll, build Pages e testes Chromium de cabelo, corpo e edição/exportação passaram. O atlas de ataque e a captura desktop foram inspecionados; o teste também gerou a captura393px e confirmou ausência de overflow horizontal.


## Ensaio isolado no combate real

O harness de navegador agora aceita o rig restrito de estudos corporais sem mudar o catálogo ou o compositor publicado. Para decidir quais ataques testar, calcula a interseção das direções presentes em todas as camadas exigidas; a presença apenas do corpo não basta se outra camada requerida estiver ausente. Pacotes antigos com cobertura explícita conservam essa declaração.

No pacote corpo/cabelo, Chromium observou os16 frames Idle,32 Walk e32 Attack pelas rotinas reais de movimento e combate. O ensaio verificou que nenhum dano ocorre antes do frame legado de impacto e que cada ataque em cada direção causa um único impacto. Também verificou limites de cache, desligamento do opt-in, Haki ativo com drenagem de vontade, ausência de novos campos visuais no save e bypass da composição humana durante a transformação Zoan.

A injeção só existe no contexto Playwright e não grava flags de aprovação, fontes ou mudanças no jogo. Portanto o teste não libera o personagem incompleto na aventura. Capturas e medições ficam na pasta local ignorada `docs/evidence-paper-doll/body-hair-review/`. A captura do ataque leste foi inspecionada no cenário real. O mesmo teste é executado pela CI para este pacote.
