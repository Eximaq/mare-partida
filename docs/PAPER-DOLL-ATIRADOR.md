# Atirador modular — prévia de combate

## Acesso e cobertura

Abra `?dev=1&paperDollReview=gunner`, selecione Atirador no laboratório e equipe o **Mosquete de Convés**. Remova botas e outras peças sem representação modular. A bancada abre com `tools/paper-doll-inspector/index.html?pack=gunner-east` (o identificador inicial foi preservado; agora cobre quatro direções).

O pacote contém Idle (4 frames), Walk (8) e Attack/firearm (8) nas quatro direções: 80 poses. Corpo, cabelo, roupa e arma são peças independentes. Idle e Walk reutilizam o conjunto humano existente. O movimento de ataque usa frames gerados próprios; não copia ataques de outra classe ou espelha direções. O cabelo e o mosquete usam encaixes rígidos medidos, com profundidade por direção. No disparo frontal a arma aparece à frente; de costas fica atrás do torso.

Este é um conjunto de **avaliação DEV**, não aprovação artística global. `approved`, `productionEnabled` e `full_character_artwork_approved` continuam falsos. Apenas o Mosquete de Convés (item 4) tem visual associado neste pacote. O Mosquete dos Faróis e demais armas mantêm fallback; não recebem um visual falso ou uma mera troca de nome. Novos equipamentos podem ser associados por `bindings`, sem trocar o corpo ou a classe.

## Integração e preservação

- Reutiliza o progresso normalizado do relógio de ataque já existente. Não altera dano, velocidade, impacto, movimentação ou hitboxes.
- Remover a arma deixa a locomoção comum e faz o ataque retornar ao sprite anterior. Reequipar restaura a composição sem recarregar.
- Habilidades, peças incompatíveis e transformações Zoan usam o renderizador anterior.
- A mesma configuração visual atende às quatro facções. Nenhum sprite exclusivo por facção foi gerado.
- Não há migração de save nem alteração dos índices de itens, mapas ou economia.
- O build publica somente o manifesto e os PNGs usados. Fontes brutas, requests, custos e capturas de teste não entram no Pages.

## Arte e recuperação

Fontes em `pixellab-pip-generations/paper-doll-gunner-20261025/`. A queda de energia não provocou repetição do job pendente. Três resultados foram recuperados pela galeria quando o getter antigo deixou de fornecer imagens.

A primeira animação leste foi reprovada pelo braço que ia para trás e falta de recuperação. A correção usa uma âncora final. Pequenos pixels da arma embutida foram separados por máscara auditável; nenhum pixel de anatomia foi repintado. As peças de roupa foram extraídas dos composites por região/paleta. Uma arma norte apontando lateralmente foi preservada como resultado reprovado e substituída por um cano orientado ao norte. Os originais continuam disponíveis.

`assemble_pilot.py` e `assemble_review.py` recompõem as camadas a partir dessas fontes. O padding é 10/13 em canvas 84×84, pivô 42/65; não há redimensionamento dos pixels finais. Ampliações são apenas auxiliares de inspeção.

## Verificação

- 83 testes Node passaram (suite de lógica, excluindo o teste Supa que exige browser).
- `tests/paper_doll_gunner_browser.py`: 80 poses sem lacunas, ataque real nas quatro direções, dano igual por direção e um único impacto, habilidades em fallback, remoção/reequipamento pelo inventário, mobile e save normal intacto.
- `tests/attack_speed_browser.cjs`: 56 cenários de impacto, velocidade, cancelamento e Zoan aprovados.
- `tests/paper_doll_unarmed_browser.py`: regressão do Lutador aprovada.
- Inspeção visual dos 32 frames de ataque no navegador; capturas locais em `docs/evidence-paper-doll/gunner/` (fora do Git).
- `python tools/build_pages.py`: build estático aprovado.

## Custo

Nesta continuação: **37 gerações com cobrança confirmada**, mais três animações recuperadas pela galeria com cobrança final não exposta e reserva de uma geração cada. Total conservador: **40**. Somado ao teto conservador anterior de 68: **108 de 300**, sem usar créditos em dólares. Não presumir reembolso das cobranças não expostas. Ledger por job em `manifest.json`.

Ataques de adagas, tecnologia e foco ainda são etapas separadas. A entrega deste pacote não declara concluídas todas as categorias nem todas as roupas do sistema Paper Doll.
