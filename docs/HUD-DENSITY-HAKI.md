# Haki e densidade das HUDs — 01/11/2026

## Estado e escopo

Branch `feature/haki-hud-density`, base inicial `02d409b`. Refinamento visual do cliente existente; nenhuma mudança nas APIs, schemas, migrações, autoridade de atributos, economia ou combate. O checkout original com alterações locais foi preservado em um worktree separado.

## Resultado

- Haki: um conjunto de controles compactos abaixo do cabeçalho, na ordem Armamento/Observação/Conquistador/Vontade. Estados reais, custos, H/J/K e somente as duas automações existentes. Informações secundárias em detalhes acessíveis por foco e toque. A reserva usa um símbolo já existente, valor e barra reais.
- Árvores: Armamento à esquerda, Observação à direita e Conquistador ao centro. Fundamentos embaixo, domínio em cima; conexões derivadas das dependências atuais. O portão continua exigindo os dois ramos completos. Um único painel de inspeção/investimento; observador de tamanho desconectado ao sair da tela.
- Forja: janela e componentes menores, prévia com colunas próximas para rótulo/atual/seta/próximo, sem mexer no cálculo. Aprimorar, Imbuir, Fusão de equipamentos/pérolas e Reforja preservados. Custos, riscos e confirmação permanecem visíveis; Kozaburo mantém proporção e rosto.
- Outras famílias: inventário, atributos, talentos, conquistas, compêndio, hierarquia, contratos, mapa, prisão, perfil, jornal, configurações e criação receberam dimensões/margens apropriadas. Talentos usa a área do inspetor quando nada está selecionado. Hierarquia aproxima títulos/requisitos/promoção.
- Chat, menus rápidos, expedição e barras: âncoras e áreas externas preservadas após comparação de geometria. Guia, Mercador e Rota também receberam limites e superfícies reutilizadas; o Mercador perdeu o grande espaço vazio ao lado da única poção. No Guia, o texto foi ampliado e a redução externa ficou em 5,1% para manter a leitura.
- Não houve geração de imagens nesta sprint. Texturas, fontes, ícones e resolução dos assets existentes foram reutilizados. Cores funcionais de raridade/progresso não foram removidas.

## Medidas comparáveis

Chromium, viewport 1920 × 1080, mesma escala CSS e mesmo personagem sintético nos painéis. Antes: arquivos da base `02d409b`. Depois: branch atual. Dimensões externas, incluindo bordas. Percentual = 1 − (largura depois × altura depois)/(largura antes × altura antes). Valores fracionários do Guia/Mercador/Rota arredondados somente na apresentação.

| Interface | Antes (px) | Depois (px) | Redução de área | Resultado |
|---|---|---|---|---|
| Criação — Sua Facção | 1690 × 1068 | 1440 × 900 | 28,2% | Validado |
| Criação — Sua Classe | 1690 × 1068 | 1440 × 900 | 28,2% | Validado |
| Criação — Sua Aparência | 1690 × 1068 | 1440 × 900 | 28,2% | Validado |
| Haki | 1640 × 1060 | 1300 × 850 | 36,4% | Validado |
| Forja | 1840 × 1060 | 1460 × 820 | 38,6% | Validado |
| Inventário | 1680 × 1060 | 1460 × 900 | 26,2% | Validado |
| Personagem | 1640 × 1060 | 1340 × 880 | 32,2% | Validado |
| Talentos | 1840 × 1064 | 1480 × 900 | 32,0% | Validado |
| Conquistas | 1720 × 1068 | 1440 × 880 | 31,0% | Validado |
| Compêndio de Akuma no Mi | 1840 × 1064 | 1480 × 900 | 32,0% | Validado |
| Hierarquia dos Mares | 1720 × 1068 | 1440 × 880 | 31,0% | Validado |
| Contratos | 1800 × 1060 | 1440 × 880 | 33,6% | Validado |
| Mapa do Arquipélago | 1840 × 1064 | 1480 × 900 | 32,0% | Validado |
| Impel Down | 1840 × 1064 | 1480 × 900 | 32,0% | Validado |
| Meu Perfil | 1600 × 1068 | 1320 × 850 | 34,3% | Validado |
| Jornal do Morgan | 1600 × 1068 | 1320 × 850 | 34,3% | Validado |
| Configurações | 1600 × 1068 | 1320 × 850 | 34,3% | Validado |
| Guia do Navegante | 1100 × 747 | 1000 × 780 | 5,1% | Validado |
| Mercador | 1100 × 409 | 580 × 339 | 56,3% | Validado |
| Rota da Caçada | 1100 × 795 | 1000 × 792 | 9,4% | Validado |

A Forja usa 61,4% da área anterior; Haki, 63,6%. Mercador: 56,3% menos área; Rota: 9,4%. As demais telas não foram forçadas a atingir 35–40%: listas, árvores, equipamentos e seletores precisam conservar sua leitura e interação. No celular, a janela continua adaptada ao viewport, com rolagem de conteúdo quando necessária. A aparência mantém os sete seletores e suas paletas; o botão de continuar permanece alcançável pela rolagem existente.

## Adendo: encaixe dos 32 patamares

As quatro placas têm 480 × 96 px, mas seus encaixes circulares têm centros diferentes. A disposição antiga usava a margem do flex e um tamanho fixo para o símbolo; isso deslocava principalmente Governo Mundial e também criava sobreposição nas placas piratas.

Agora cada facção declara centro e diâmetro proporcionais ao encaixe real da arte. O símbolo é posicionado por esse centro, independente de texto, padding, altura e resolução. O título respeita uma região própria e fonte responsiva, incluindo nomes longos. A mesma correção vale para consulta, título atual/próximo e componente de promoção. Nenhuma patente, requisito ou regra de promoção foi alterada.

## Validação executada

- 24 arquivos de testes Node pertinentes de Haki, Forja, personagens, inventário, talentos, compêndio e interfaces passaram; as três suítes de Hierarquia/títulos/conquistas foram conferidas novamente após o adendo.
- `tests/hud_density_browser.cjs`: 20 telas/estados × 8 viewports (1920×1080, 1366×768, 1280×720, 1024×768, 393×852, 360×800, 320×568, 844×390), limites/overflow/fechamento; abertura e redimensionamento não alteram inventário, atributos, talentos, saldos ou Haki. Testa estados reais, detalhes por teclado/toque, árvore, inspetor de Talentos, cinco operações da Forja, nomes longos e valores grandes.
- `tests/gameplay_harmony_geometry_browser.cjs`: 82 estados × 15 superfícies em nove viewports, comparados à mesma base; nenhuma diferença nas posições/tamanhos/visibilidade das HUDs fixas. Inclui lobby, caçada, pausa e duas/três skills.
- `tests/forge-hd-browser.cjs`: quatro abas, ambos os modos de fusão, nove viewports, campos texturizados, recursos carregados, ações alcançáveis, listas vazias, sem sockets e cálculos da prévia sem consumir RNG.
- `tests/character_studio_browser.cjs`: quatro facções, sete classes, ícones com alfa, alinhamento dos seletores, distribuição transacional de atributos, detalhes por foco/clique, aparência compartilhada, quatro direções, persistência e sete viewports. O hook do teste passou a usar o ponto de diagnóstico estável; o teste aguarda a prévia atualizada antes de confirmar.
- `tests/haki_mastery_browser.cjs` completo: investimento, falha de armazenamento, confirmação desatualizada, gate dos dois ramos, reload, H/J/K, exclusividade, automações, consumo/expiração, morte/porto, migração protegida, VFX e responsividade. A caçada alcançou 34 mortes. Amostra headless local: p95 de 33,4 ms nas quatro fases; máximo de 50,1 ms no Armamento; três canvases antes/depois. Amostra curta e dependente da máquina; não constitui garantia de FPS nem ensaio prolongado de memória.
- `tests/hierarchy_plate_browser.cjs`: 4 facções × 8 patamares × 6 viewports; centros e dimensões proporcionais à arte, separação entre título e símbolo, altura do texto, consulta sem mudar facção/cargo; painel de componentes com todas as 32 variantes.
- `python tools/build_pages.py`: pacote estático com caminhos relativos. Testes de densidade e placas também executados contra o pacote estático.
- `git diff --check` e sintaxe Node dos módulos/testes alterados.

Na preparação da validação, uma rodada do teste de placas registrou uma falha isolada no carregamento de MareCombatVfx. O teste passou a aguardar a prontidão dos recursos antes de criar o personagem; a repetição e o pacote estático passaram sem exceções. O motor de VFX não foi alterado por esta sprint.

As capturas e fixtures ficam fora do Git. O workflow Haki publica capturas como artifacts de CI; não inclui saves de usuários. A galeria local compara as imagens completas na mesma escala e oferece acesso ao tamanho original.

## Arquivos e decisões

`haki-ui.js`, `haki-mastery.css`: apresentação/observador e estados. `game.js`: desmontagem do observador ao renderizar/fechar. `forge-ui.js`: marcação da prévia. `ui-screens.css` e `index.html`: variante de densidade por família. `honors-hd.css`: encaixes de patentes. Testes de navegador, workflow, README e guias registram validação e reprodução.

## Compatibilidade, rollback e pendências

Sem nova chave/schema de save, migração, custo, drop ou fórmula. As alterações podem ser revertidas pelos commits da sprint sem converter dados persistidos. A branch incorporou origin/main db53454 (PRs 194/195, níveis/atributos autoritativos) sem conflitos, preservando esses commits de servidor. O diff da sprint contra main não inclui backend.

Continuam pendentes as fontes oficiais dos fragmentos, o balanceamento provisório e a política de compensação/tratamento do antigo Rei: [PENDENCIAS_HAKI.md](haki/PENDENCIAS_HAKI.md). Tripulações não foram incluídas nem retomadas. A próxima etapa funcional de Haki depende dessas definições do proprietário; esta sprint entrega apresentação e validação.
