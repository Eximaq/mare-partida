# Primeiro teste artístico Paper Doll — 20–21/10/2026

Branch `feature/paper-doll-primeiras-pecas`, base `origin/main dc59e4d`. A base técnica comum foi publicada pelo PR43 e conferida em Chromium no GitHub Pages. Este piloto não ativa arte nova no jogo.

## Aprovação e consumo

O proprietário aprovou quatro chamadas `edit_image_pixen`,84×84 transparente: corpo e três adições independentes (cabelo, roupa e espada), com extração dos pixels alterados para inspeção e sem retries. A primeira base perdeu os detalhes faciais. Foi aprovada uma correção adicional de1 geração, elevando o teto total para5. As cinco chamadas terminaram, cada uma com cobrança de1 geração informada pelo getter: **5 gerações cobradas, nenhum job pendente, nenhuma nova tentativa autorizada**.

## Resultado e limites

- Corpo inicial: canvas84×84 e bounding box31,22–53,65 preservados; rosto apagado. Original preservado como resultado reprovado.
- Correção facial: adicionou rosto, mas alterou387 pixels fora da região da cabeça. O bruto falhou no contrato de preservação. Uma **prévia local de inspeção**, `body-face-fit-draft.png`, mantém o primeiro corpo e copia somente75 pixels gerados na região37,22,10,11. O teste desse rascunho confirmou zero mudança fora da região e recomposição exata. Não é uma base artística final aprovada.
- Cabelo:378 pixels alterados fora da região,1 apagamento de alpha; encobre o rosto e parece visto de costas. Reprovado.
- Roupa:122 alterações fora da região; também mudou o shorts apesar do pedido de camisa/colete. Reprovada.
- Espada:372 alterações fora da região; o corpo foi redesenhado junto com a arma. Reprovada como camada reutilizável.

**Não foram exportadas camadas reutilizáveis de cabelo, roupa ou espada. Não há animação modular nova.** A montagem do rosto, os resultados brutos e a folha de comparação são rascunhos/inspeções, nunca arte final. Todos os pixels visíveis vieram do PixelLab; não houve pintura, recoloração ou fabricação local de conteúdo.

## Arquivos e inspeção

Originais, referência, inspeções8× separadas, relatório dos PNGs/hashes, manifesto com os cinco prompts exatos, traduções e custos, e blueprint estão em `pixellab-pip-generations/paper-doll-human-pilot-20261020/`. A referência é o primeiro frame sul nativo56×56 do pirata, colocado em canvas84×84 com offset14/13, sem resampling.

Abra `preview.html` nessa pasta pelo servidor local para comparar resultados e falhas. Os PNGs nativos estão ligados individualmente; CSS apenas amplia em nearest-neighbor. O pacote Pages não distribui esse piloto, seus resultados reprovados ou os scripts Python.

## Ferramenta de verificação

`tools/paper_doll_fit_audit.py` verifica uma adição ancorada usando região retangular ou máscara binária do mesmo canvas. Rejeita alterações fora da região/máscara, apagamento de pixels do corpo, edição vazia, incompatibilidade de canvas e recomposição inexata. Só exporta uma camada quando passa; copia pixels gerados sem reparar, recolorir ou completar arte. Esse teste estrutural não substitui a inspeção artística nem prova animação.

Validação: seis testes Python passaram (fixtures sintéticas, sem entrega de arte), build Pages e inspeção da página de revisão em Chromium desktop/mobile. Jogo, saves, equipamentos e sprites anteriores não foram alterados nesta branch. Rollback por revert do checkpoint; não há migração de save.

## Proposta seguinte — sem consumo autorizado

O teste demonstra que edição Pixen sem máscara não garante pixels fixos fora da peça. Foram preparados guias binários de geração (não sprites): máscara de cabelo preservando o centro do rosto; roupa preservando mãos/shorts; espada delimitada à empunhadura/objeto. Nenhuma chamada com esses guias foi feita.

Rota proposta: MCP `inpaint_image`,84×84, `crop_to_mask:true`, com a mesma base e uma máscara por peça. Custo documentado10 gerações/chamada; três peças custariam30 novas gerações,35 acumuladas com o piloto. Inspecionar primeiro o cabelo e só continuar as outras duas se passar. Sem retries. A mudança de ferramenta e o gasto exigem aprovação própria antes de qualquer chamada.
