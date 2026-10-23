# Paper Doll — continuidade do corpo-base

## Entrega e limite

[Abrir corpo-base na bancada](../tools/paper-doll-inspector/index.html?pack=body-continuity) · [Ataque vestido](../tools/paper-doll-inspector/index.html?pack=bento-east-fit).

O pacote `paper-doll-body-continuity-20261022` reúne **80 poses corporais reais**: 16 de repouso, 32 de caminhada e 32 de ataque de espada. Todas usam células84×84, pivô42/65 e a escala original. Idle conserva4FPS/4frames; Walk8FPS/8frames; Attack12FPS/8frames, execução única. As quatro direções conservam suas próprias imagens, sem espelhamento ou reaproveitamento de uma direção como outra.

Este pacote é **um estudo corporal**, não o personagem modular completo. Cabelo, roupa, calçados e arma não foram misturados entre os pilotos. O shorts incorporado às fontes corporais continua preservado; não representa uma camada de calças separada neste estudo. O personagem publicado continua usando os assets atuais.

## Fontes e auditoria

- Idle/Walk: `paper-doll-walk-profiles-20261021/body-idle.png` e `body-walk.png`.
- Attack: `paper-doll-east-fit-20261022/body-attack.png`, incluindo os retoques anteriores norte/leste.
- `assemble_review.py` copia os três PNGs byte a byte e verifica dimensões, poses não vazias e variação real em cada sequência/direção.
- `source-audit.json` registra origem, SHA-256 dos arquivos, bounds e hash RGBA das80 células. Nenhum pixel foi pintado, interpolado, removido ou recolorido.
- Não houve chamada PixelLab, geração paga, novo job ou consumo de orçamento nesta etapa. Não existe receita de geração nova: a reprodução consiste na montagem local das fontes preservadas.

A comparação sem roupa permite observar que os conjuntos compartilham a referência de corpo, mas o ataque entra numa guarda mais aberta, com mudanças de apoio. As vistas laterais têm diferenças de contorno/rosto entre os estudos. A compatibilidade de canvas/pivô e igualdade dos pixels **não aprovam** essas transições artisticamente. O ensaio completo é a referência de revisão dessas pendências.

## Importação segura na bancada

O escopo explícito `body-motion-review` permite importar somente uma peça corporal para inspeção. Exige `reviewOnly:true`, `productionEnabled:false`, `full_character_artwork_approved:false`, apenas `body` em `requiredSlots` e na aparência, e nenhuma associação de equipamentos. Remover o escopo não afrouxa a validação normal de corpo/cabelo/roupa/arma. Toda peça importada continua recebendo `approved:false`.

A interface identifica **Corpo-base · Sem vestuário**, desativa os controles das camadas não incluídas e usa o estado `body-study`, distinguindo-o de um pacote vestido. O usuário pode ensaiar as três ações, pausar e inspecionar qualquer frame. O caminho do jogo, catálogo de produção, eventos de impacto e saves não foram alterados. O renderizador normal rejeita a peça sem aprovação.

## Próxima produção

1. Revisar entrada/saída da guarda e os contornos laterais neste conjunto corporal, antes de qualquer nova geração.
2. Padronizar um único vestuário/cabelo entre repouso, caminhada e ataque. Os conjuntos azul antigo e carmesim de ataque não foram aceitos como intercambiáveis.
3. Validar as camadas e o contato da arma em todas as80 poses antes de habilitar o protótipo completo.
4. As demais categorias de ataque continuam pendentes; não se gera movimento diferente apenas por facção.

## Validação

O teste Chromium compara cada uma das80 poses do Canvas com o PNG nativo em escala inteira2×, percorre a sequência completa, verifica rejeição de importações fora do escopo, bloqueio em produção, ausência de alteração do save e enquadramento393px. Capturas ficam em `docs/evidence-paper-doll/body-continuity-*.png`, fora do Git. Este teste é incorporado à CI junto à montagem determinística.

As nove suítes Node Paper Doll, o build Pages e os testes Chromium de corpo, continuidade e edição/exportação de camadas passaram. Capturas desktop e celular foram inspecionadas. A validação visual do personagem completo permanece pendente, independentemente dos testes técnicos.
