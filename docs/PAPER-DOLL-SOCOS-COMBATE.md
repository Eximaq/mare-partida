# Personagem único — soco modular no combate

## Entrega de 24/10/2026

Pacote DEV `?dev=1&paperDollReview=unarmed`, também disponível na bancada com `?pack=unarmed`.
Corpo, cabelo e roupa compartilham 80 poses: Idle (4), caminhada (8) e soco (8), nas quatro direções. As 24 poses de soco anteriores foram reaproveitadas; somente corpo/roupa do norte receberam novas gerações. A roupa é extraída por região/paleta dos PNGs nativos; o corpo permanece intacto. O cabelo usa o encaixe rígido já suportado, com posição do couro cabeludo verificada.

No laboratório, escolher Lutador, remover arma, botas e outras peças sem representação modular e entrar numa caçada. O acesso está no botão DEV. A configuração continua transitória/isolada do save normal. Corpo/locomoção continuam compartilháveis por sete classes e quatro facções; apenas Lutador tem soco neste pacote. Espadachim mantém o ensaio azul existente. As outras categorias não recebem socos emprestados.

A integração usa o `basicAttackPose()` e seu progresso normalizado, introduzidos na main pelo sistema de velocidade de ataque. Não cria outro relógio, impacto, atraso, trava ou regra de dano. Durante habilidades, Zoan, armas equipadas e peças incompatíveis, permanece o renderizador anterior. Foram descartadas as alterações experimentais locais baseadas na antiga duração fixa de 0,22s.

## Validação

- `tests/paper-doll-unarmed.test.cjs`: entrada DEV explícita, 28 identidades, incompatibilidade de armas/Zoan e rejeição de manifestos inválidos.
- `tests/paper_doll_unarmed_browser.py`: 80 composições reais comparadas pixel a pixel, quatro direções no ataque real, oito poses, apenas um impacto pelo relógio existente, dano igual entre direções, desenho sem dano adicional, habilidades isoladas, mobile e save normal preservado.
- Build Pages inclui somente manifesto e PNGs usados; prompts, originais de geração e auditorias não entram no site.
- Testes/capturas ficam em `docs/evidence-paper-doll/unarmed/`, fora do Git.

## Custo e pendências

O corpo norte consumiu 1 geração confirmada. A roupa foi cotada em 10, entregue pela galeria sem repetir a chamada; o getter do job não expôs cobrança final. Ledger em `usage.json`: 43 confirmadas no lote compartilhado, mais roupa com teto conservador de 25; até 68 de 300 reservadas/confirmadas. Não afirmar que o custo final desconhecido foi reembolsado.

`approved:false`, `productionEnabled:false` e `full_character_artwork_approved:false` permanecem. Esta é uma versão funcional para avaliação, não liberação artística global. Ainda faltam ataques modulares de arma de fogo, adagas, tecnologia, magia e suporte, além de novas roupas/equipamentos. Não alterar mapas, economia, atributos ou saves para completar essas peças.
