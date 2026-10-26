# Personagem único — sete classes, seis ataques básicos

26/10/2026. Infraestrutura e cobertura de ataques básicos concluídas para avaliação no laboratório. Não é uma migração global de todo o catálogo de equipamentos ou uma aprovação artística automática.

## Como testar

Abra `tools/paper-doll-inspector/index.html?pack=complete`. Selecione qualquer uma das sete classes e quatro facções na mesma janela. Idle, Walk e Attack mantêm corpo, cabelo, roupa e arma separados. O gesto muda conforme a categoria; a facção não duplica a animação.

Para combate, abra `?dev=1&paperDollReview=complete`, escolha a classe no laboratório e use sua arma inicial. Remova botas e demais peças sem arte modular. O Lutador usa mãos livres: remova sua arma. O save normal permanece isolado.

| Classe | Equipamento do protótipo | Movimento |
|---|---|---|
| Espadachim | Espada de Ferro Salgado (0) | Corte existente |
| Lutador | Sem arma equipada | Soco existente |
| Atirador | Mosquete de Convés (4) | Mira/disparo existente |
| Gatuno | Adagas da Bruma (12) | Estocada existente |
| Ciborgue | Manopla de Aço (14) | Gesto de mira reaproveitado, peça tecnológica separada |
| Estrategista | Compasso de Tempestade (16) | Canalização nova |
| Suporte | Cajado do Farol (31) | Mesma canalização, outro equipamento |

## Arquitetura e integridade

O pacote `paper-doll-complete-20261026` reúne as animações por categoria no mesmo corpo, roupa e cabelo. `categoryWeapons` define a peça padrão; os bindings do inventário escolhem a arma específica, inclusive compasso e cajado na mesma categoria. Sem arma, a camada opcional é removida; só o Lutador dispõe de ataque desarmado neste conjunto.

`completeCategories` exige os seis movimentos e todas as direções no carregador DEV. A auditoria distingue arma ausente legitimamente em punhos de uma arma cujos assets faltam. Peças obrigatórias continuam corpo/cabelo/roupa; equipamentos incompatíveis ou não mapeados mantêm fallback completo. Produção e aprovação artística permanecem desligadas.

Tecnologia reutiliza os pixels e tempos do gesto de disparo validado. Canalização tem 8 frames nativos por direção, mantendo o eco da referência separado. Roupas são extraídas dos compostos PixelLab sem substituir corpo/mãos. Equipamentos são regiões isoladas das edições, com encaixes medidos; as alterações de anatomia feitas pelo gerador ficam somente nos originais. Cabelo reutilizado com offsets de cabeça. Canvas 84×84, pivô 42/65, padding 10/13 de fontes 64×64, sem escala ou anatomia espelhada.

A manopla, o compasso e o cajado continuam rígidos e seguem a mão. O cajado lateral teve a máscara de extração corrigida após inspeção, preservando os pixels originais. O compositor não cria acertos, projéteis, atributos ou regras novas.

## Testes executados

- 88 testes Node antes da sincronização final com main.
- Chromium: 560 poses (7 classes × 4 direções × 20 poses de Idle/Walk/Attack).
- Combate real das sete classes: oito poses por ataque, quatro direções, um impacto, troca/remover/reequipar arma, fallback de habilidades, celular e save normal preservado.
- Revisão de mundo: Haki, cache limitado, desativação da prévia, save e bypass de Zoan.
- 56 cenários de velocidade de ataque, incluindo humanos e Zoan.
- Build estático e capturas de comparação inspecionadas em `docs/evidence-paper-doll/complete/` (não versionadas).

## Custos e recuperação

19 chamadas novas: 4 animações de corpo, 3 transferências de roupa e 12 edições de equipamento. Nenhuma repetição paga. 20 gerações tiveram cobrança final exposta. Após a pausa, 8 resultados foram recuperados da galeria; os getters antigos já não expunham imagens/cobrança. Mantemos a reserva conservadora de 56 para esses resultados (6 edições a 1 e 2 transferências a até 25), sem presumir reembolso ou cobrança exata.

Compromisso conservador desta etapa: **76**. Acumulado anterior 146; total conservador **222/300**, restando 78. Todos os resultados foram recuperados e não há jobs pendentes deste lote. Fontes, prompts exatos e receita estão em `paper-doll-final-categories-20261026`. Não reexecutar a receita para recuperar arquivos já presentes.

Os prompts pedem, em inglês, gesto curto de canalização sem giro ou efeitos, roupa clara/colete azul mantendo a pose e adição isolada de manopla metálica, compasso azul ou cajado âmbar. A receita conserva os campos exatos e fontes locais, sem URLs assinadas ou credenciais.

## Limites restantes fora da cobertura básica

Os equipamentos adicionais, novos cabelos/roupas e animações específicas de habilidade, dano e morte continuam no sistema legado quando não cobertos. A arte completa precisa da avaliação do proprietário antes de uma troca global na aventura. O pacote unificado permite avaliar tudo no mesmo lugar; não altera mapas, economia, saves normais ou regras das sete classes.
