# Sprint 3 — Sua Aparência

Base: 4ea153f, Sprint 2/PR155. Branch: feature/character-appearance-step3. A revisão deve entrar após a Sprint 2; não há merge automático.

## Fluxo e opções

Facção/nome → Sua Classe → Sua Aparência → confirmação → aventura. Voltar preserva o rascunho; somente a confirmação grava. O editor em Personagem → Aparência reutiliza as mesmas escolhas e composição. Não há seleção nova de raça, voz, roupas, cicatrizes ou acessórios.

- Dois modelos: masculino e feminino; gênero não altera atributos ou classe.
- 12 penteados de catálogo, além do original e sem cabelo. Dez cores com cinco tons por material.
- Cinco modelos de olhos: Original, Sereno, Determinado, Amendoado e Atento; seis cores independentes.
- Pele Natural, a única variante anatômica suportada. Oito tonalidades. As setas de variante única ficam desabilitadas; não se anunciam variantes inexistentes.
- Prévia em Norte, Sul, Leste e Oeste. Seletores, setas, paletas com nome/estado acessível, navegação por teclado e layout móvel. Equipamento inicial é apenas mostrado, não escolhido nesta etapa.

## Estado e composição

character-appearance.js é a fonte compartilhada de escolhas, paletas e validação. O save usa appearance96 versão 1: gender, hairStyle, hairColor, eyeStyle, eyeColor, skinStyle e skinColor. Nenhum atributo, equipamento ou classe fica nessa estrutura. read/normalize não mutam o personagem; apply cria uma cópia; commit persiste a cópia antes de trocar o estado vivo. Falha de armazenamento mantém personagem e aparência anteriores. A criação e a edição de classe montam o candidato antes da gravação.

paper-doll-96-lobby.js resolve a aparência salva no jogo padrão e conserva o ensaio temporário explícito. A prévia de um rascunho usa preview/compose do mesmo compositor, com apenas um clipe e caches limitados; não prepara todos os ataques para cada amostra de cor. O jogo prepara os clipes de caminhada e combate após a confirmação. Pivôs e tempos existentes não foram alterados.

wardrobe.js aplica a paleta dos olhos somente aos índices/tom de eyeIris (ou originalEyeIris). Contornos, esclera, pele e roupa ficam fora dessa máscara. A direção Norte não possui íris. A pele usa os materiais nativos de cabeça, pescoço, braços, mãos e pernas; a troca não recolore os equipamentos.

A política de headgear-visibility.js permanece compartilhada: ID19 visível oculta os cabelos; ao ocultar/desequipar, o penteado/cor salvos reaparecem. ID18 preserva cabelo. A preferência não faz parte do rascunho cosmético nem altera bônus.

## Arte PixelLab e correção da testa

Foram geradas quatro amostras Pro Flash com o pedido artístico HD Pixel Art Masterpiece, em atlas nativo 192×128, seis células de 64×64: masculino/feminino × Sul/Norte/Leste. Nenhuma redução de resolução. Cada célula foi separada em uma camada 128×128 no encaixe existente; Oeste espelha Leste no eixo nativo de soma 128. São 32 PNGs novos finais. Imagens-fonte permanecem na galeria do proprietário; evidências e arquivos de trabalho ficam fora do Git.

| Recurso | Job PixelLab | Galeria | Custo confirmado |
| --- | --- | --- | --- |
| Coque alto | 79e9d5b9-3cfc-4e08-9265-9d6c57c8c5a6 | c83e76a2-be0c-55d9-8d65-a3d244bc5826 | 6 gerações |
| Olhos amendoados | d344db12-b083-467f-9c6c-bfd422c3679d | e50cc8fc-45e0-59b5-94a6-3cd6f9da3b0e | 6 gerações |
| Afro arredondado | 411832d7-cc72-4fb9-be1e-039af256649b | 541994b3-5f6f-5c1b-a1b9-43c2b8a80e49 | 6 gerações |
| Olhos atentos | 7de62392-3c66-4572-886d-c0652f74009a | 9f070864-f6d0-50e5-8ab1-a69e3475cf48 | 6 gerações |

Total: 24 gerações; saldo observado 1615,36 → 1591,36. Primeiro coque/olhar foram testados nas 480 poses antes do segundo par. A análise posterior do proprietário identificou uma faixa de pele na camada do coque sendo pintada de roxo. O ensaio inicial verificava encaixe/oclusão, mas não distinguia esse material. A faixa foi removida da camada de cabelo; a cabeça nativa fornece a pele. O mesmo critério alcança o afro e as sombras das orelhas/pescoço, preservando a tonalidade escolhida.

separateGeneratedHairSkin em tools/paper_doll_96_head_materials.cjs é uma operação de importação para essas fontes castanhas e esses dois penteados curtos. Não é um classificador universal de cabelo: não aplicar indiscriminadamente a cabelos loiros, longos ou com orelhas cobertas. A proteção anatômica usa a cabeça nativa e regiões de orelha/pescoço expostas, além da separação de cores. Não basta impedir a recoloração e deixar pele clara colada sobre pele escura.

As feições geradas tiveram a matte de pele removida; ficaram íris, pálpebras, sobrancelhas, esclera e boca. Foram recortadas à cabeça canônica, mantendo as proporções. Partes desconectadas que eram resíduos de orelha/rosto foram excluídas da camada de cabelo. Alpha final é binário. Os PNGs dos penteados e rostos anteriores foram preservados.

## Acrescentar opções

1. Reutilizar as cabeças originais, face limpa e encaixes do catálogo. Produzir um piloto pelo PixelLab, respeitando escala e quatro vistas (Oeste espelhado somente quando a regra canônica permitir).
2. Separar material de cabelo, pele e feições; validar testa, têmpora, orelha e nuca em cores contrastantes e pele clara/escura. Limpeza de fragmentos não prova separação de materiais.
3. Registrar layers e procedência em appearance-catalog.json; para olhos, gravar índices exatos de íris e tons de sombra/luz, sem incluir contorno ou esclera. Incluir a opção em character-appearance.js; não inventar outro renderizador ou estado por gênero.
4. Validar o piloto nas animações e com capacete antes de ampliar. Reexecutar testes de composição, persistência e a regressão da testa.

## Compatibilidade e limites

Saves sem appearance96 mantêm o visual anterior até editar/confirmar; recebem padrões válidos na leitura do editor, sem itens/moeda extras. Campos inválidos são normalizados. A escolha preta/sem cabelo é sincronizada com paperDollLook para o fallback antigo; a roupa-base herdada permanece preservada. O fallback explícito paperDoll96=0 continua sendo o conjunto antigo, sem prometer novos estilos/cores nesse renderizador. DEV mantém save separado e exige paperDoll96=1 para prévia nativa.

O ensaio paperDoll96=1 continua temporário e não sobrescreve os cosméticos salvos. Transformações Zoan preservam seu visual próprio. Remover a atualização/reverter o commit não apaga o campo cosmético do save; a versão anterior simplesmente o ignora. Guardar save próprio antes de testes manuais, sem versioná-lo.

## Verificação

Testes novos: tests/character-appearance.test.cjs, tests/character_appearance_browser.cjs e tests/character_appearance_materials_browser.cjs. O primeiro inclui proteção da matte quente e das sombras de pele; o navegador reproduziu a testa roxa antes da correção. O ensaio material percorre 480 poses dos dois modelos, alternando novos cabelos/olhos, pele clara/escura e cores contrastantes; compara oclusão, restauração e bordas. O fluxo verifica voltar, confirmação/cancelamento, rascunho sem gravação, reload, edição compartilhada, invariância dos atributos e rollback de storage em seis resoluções.

Os consumidores históricos do fluxo de criação foram atualizados para passar pela Etapa 03 e confirmar. Fixtures do jogo padrão escolhem o gênero no estado persistente; o ensaio continua com seu seletor temporário. O job appearance96 executa os testes novos em Pages, além das regressões anteriores.

### Resultados locais de 30/10/2026

- Suíte geral: 170 testes Node aprovados; regressões dirigidas de aparência/lobby/capacetes reexecutadas após o ajuste de compatibilidade.
- Criação/editor no navegador: duas anatomias, cores, quatro vistas, setas/teclado, trocas rápidas, voltar/cancelar, save/reload e rollback; seis resoluções. Revisão manual no navegador sem erros registrados.
- Materiais novos: 480 poses após separar testa/orelhas/pescoço, sem violações de borda, oclusão ou restauração. Comparativo das quatro vistas revisado visualmente; fontes antigas de cabelo também inspecionadas em paleta contrastante, sem alterar seus PNGs.
- Inventário/cabeça: ID18/19 nos dois corpos, dez alternâncias por caso, equipar/retirar, reload, rollback e posição do botão aprovados.
- Lobby em ensaio: oito comparações de pixels, 28 perfis, quatro prévias de ataque, oito viewports; caches 48 imagens/2 conjuntos/4 prévias, pico de seis cargas, fallback e isolamento do save aprovados.
- Combate padrão: 24 confrontos com lâminas e 20 com as demais armas, dois corpos; 40 abates de fixtures. Auto-caçada acelerada das demais cinco classes: 103 abates com spawns/IA do jogo. Não representa medição de FPS real.
- Fallback84: criação e preferências, equipamentos, reload e DEV aprovados. Build Pages e portal; quatro testes Python de exportação/build; testes de cache no navegador dos dois builds e do jogo móvel aprovados.
- Sintaxe dos consumidores históricos migrados verificada; não se afirma execução completa de todos os seus cenários E2E. O teste Supa E2E, que exige cenário próprio, fica fora da suíte Node comum conforme a regra existente.

Evidências locais recentes: pasta privada Sprint-Aparencia96/previews na biblioteca de trabalho do proprietário; nenhum save ou captura em massa é versionado. CI executa uma revisão independente no PR.
