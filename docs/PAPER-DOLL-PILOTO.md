# Primeiro teste artístico Paper Doll — 20/10/2026

Branch `feature/paper-doll-primeiras-pecas`, base `origin/main dc59e4d`. A base técnica comum foi publicada pelo PR43 e conferida em Chromium no GitHub Pages. Este piloto não ativa arte nova no jogo.

O proprietário aprovou quatro chamadas `edit_image_pixen`,84×84 transparente, uma para o corpo e três adições independentes (cabelo, roupa e espada), condicionadas à aprovação técnica/artística do corpo. Também autorizou a extração dos pixels alterados e composição da prévia. Não autorizou retries.

## Resultado

Executada somente a chamada de corpo, job `bb887c4b-bc36-4bcb-ae74-6d81bf81a110`, asset `6f41cbf7-8d65-52b6-88eb-1a1aabfd9f42`. O getter informou cobrança de1 geração. O resultado preservou84×84 e o bounding box31,22–53,65, mas apagou os detalhes faciais solicitados. **Reprovado; nenhuma chamada dependente executada.** Não há camadas de cabelo/roupa/espada produzidas nem animação nova. Não existe job pendente deste piloto.

Originais, referência, inspeções8×, manifesto e blueprint estão em `pixellab-pip-generations/paper-doll-human-pilot-20261020/`. As inspeções ampliadas são auxiliares separados; não são sprites finais. A referência é o primeiro frame sul nativo56×56 do pirata, colocado em canvas84×84 com offset14/13, sem resampling ou pintura.

## Ferramenta de verificação

`tools/paper_doll_fit_audit.py` verifica uma adição ancorada contra seu corpo-base e uma região retangular permitida. Rejeita mudanças fora da região, apagamento de pixels do corpo, edição vazia, incompatibilidade de canvas e composição que não reproduza exatamente o resultado PixelLab. Só exporta uma camada quando essas verificações passam; copia os pixels gerados sem reparar, recolorir ou completar arte. Esse teste estrutural não substitui a inspeção artística e não prova cobertura de animação.

Validação local: `python tests/paper_doll_fit_audit_test.py` (fixtures sintéticas, sem entrega de arte), `python tools/build_pages.py`. O jogo, arquivos de runtime, saves, equipamentos e sprites anteriores permanecem sem alterações nesta branch. O piloto não é incluído no pacote Pages. Para desfazer este checkpoint basta reverter seu commit; não há migração ou save a restaurar.

## Próxima ação, ainda não autorizada

Avaliar uma edição do corpo gerado para restaurar apenas olhos/nariz/boca. Uma nova chamada Pixen custa1 geração; continuar depois com as três adições elevaria o teto do plano de4 para5. Requer aprovação porque o lote original excluía retries. Se a correção falhar, parar novamente; não converter o corpo sem rosto em personagem final nem simular frames de animação.
