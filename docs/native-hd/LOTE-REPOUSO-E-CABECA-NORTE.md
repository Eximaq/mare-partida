# Repouso Sul feminino e cabeça no disparo Norte

Base `a546bf6`, PR #348. Provas de seleção e Canvas local. Sem novos sprites, troca de animação, dados salvos ou publicação.

- **Botas 176 e 183**, repouso Sul feminino com Peitoral 151 e sem outra peça visual. A referência B9 orienta os quatro passes por peça, trás em −1 e frente em 45, no mesmo inferior e pivô. Em 18 trocas por paleta salva, zero diferença fora do alfa da própria bota, alfa da sola intacto e mudança máxima de três níveis no contorno translúcido. Retirada restaura RGBA exato. Original permanece no próprio cadastro anterior; não trocar o desenho do peitoral para acoplar bota. As outras oito botas ficam de fora da rota salva Sul: o fundo de pele aparecia na sola.
- **Oito peças de cabeça** (129, 136, 143, 150, 157, 164, 171, 178), disparo feminino Norte das armas 4, 5, 113, 114, 115 e 116, sem outro equipamento visual. A mesma referência de cabeça autoral recebe o deslocamento do recuo no quadro 4, sem compensar com movimento de corpo. Em 384 quadros, trocas só no alfa das cabeças antiga/nova; pernas, braços, roupa, arma e relógio iguais. `Ocultar capacete` volta à mesma rota sem peça em 48 verificações. Capacetes 18/19, variantes não registradas e combinações com peitoral e luvas ainda não foram liberadas nesse recorte.
- **Reuso ainda em diagnóstico**: disparo e tecnologia compartilham o mesmo corpo vestido em oito fases por direção no acervo; Leste/Oeste são espelhos exatos. Isso reduz a autoria/recuperação de máscaras restantes nesse acervo, mas não autoriza trocar as armas de tecnologia cujo cadastro de jogo usa atualmente o soco.

Build Pages local e testes `rework-female-south-idle-boots.cjs` / `rework-firearm-north-headgear.cjs`.
