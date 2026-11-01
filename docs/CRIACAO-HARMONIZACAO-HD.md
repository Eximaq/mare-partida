# Criação e harmonização HD

Base: d87f40d, após PR #184. Branch feature/creation-gameplay-harmony-hd.

Sua Classe será uma lista compacta de sete opções e um painel com os três intermediários e os três finais reais de MareTalents.getTree. Atributos iniciais vêm de MareCharacters.birth; nomes e bônus de facção usam o catálogo configurado do jogo. A edição de identidade existente permite alterar facção; portanto não será exibida uma proibição inexistente.

O material reutilizado será assets/ui/forge-hd/workshop-surface.png (512×512), com proveniência no manifesto da Forja e token --rpg-workshop-surface. Ícones especiais, classes e quatro emblemas serão reaproveitados. As ilustrações de identidade faltantes serão produzidas no PixelLab AI, sem novos sprites ou ícones de habilidade.

Foram registrados 63 estados de geometria em nove viewports antes de editar: 1672×941, 1920×1080, 1366×768, 1280×720, 1024×768, 760×900, 393×852, 320×568 e 844×390. Evidências e JSON completos permanecem em tmp, fora do Git.

Em 1672×941: menu principal x1334/y18/320×52; ações x733,5/y865/205×58; chat aberto x18/y739/294×184; expedição aberta x1366/y184/288×587; widget diário x1410/y731,203125/244×143,796875; Explorar os mares x1410/y885/244×38. Serão comparados com os mesmos estados finais, sem mudanças de posicionamento e tamanho autorizadas nessas HUDs.

## Implementação validada

- Criação: lista compacta de sete classes; painel selecionado com função, alcance e atributos predominantes do jogo; cinco atributos reais de nascimento (50 pontos); seis especiais em grade 3×2 no desktop.
- Os especiais são os três intermediários e três finais de `MareTalents.getTree`. Seus tooltips preservam descrição completa, portas de progressão e custo. São informativos, sem investimento durante a criação.
- Facções: quatro cenas distintas, emblemas oficiais completos, seleção e resumo ligados ao mesmo catálogo. Nenhuma alteração de bônus ou nova regra de permanência.
- Aparência: continua sendo `MareCharacterStudio.appearance`. Rascunho, retorno entre etapas e confirmação/persistência continuam com o controlador existente.
- Gameplay: superfícies dos menus, chat, ações, exploração e expedição reaproveitam `--rpg-workshop-surface`, molduras aprovadas e ícones existentes. Não há tema global novo nem mudança do cenário.
- A expedição preserva as fontes anteriores: inimigos/chefes/dano são totais do personagem; Berry são da sessão. Tooltips identificam essa distinção. Taxas continuam com a janela original de 20 segundos. O indicador agora distingue porto, pausa e atividade.
- Textos continuam como HTML, não estão incorporados às ilustrações. As ilustrações de classe só são solicitadas ao selecionar a classe; contadores não recriam o painel de criação.

## Artes efetivamente geradas

11 imagens PixelLab AI Pro, 512×288 nativos: sete ilustrações de classe e quatro cenas de facção. Ícones, emblemas, sprites, habilidades e talentos foram reutilizados. O primeiro rifle do franco-atirador foi rejeitado na revisão e substituído por uma carabina compacta, com cano único, coronha e empunhadura legíveis.

Proveniência, prompts, IDs de geração/galeria, custos e hashes estão em `assets/ui/creation-hd/manifest.json`. Total real: US$1,80 (12 gerações, incluindo a versão rejeitada). Nenhuma geração ocorre em gameplay.

## Geometria comparada

O teste `tests/gameplay_harmony_geometry_browser.cjs` serve o HTML/JS da base do PR por interceptação, sem sobrescrever arquivos locais, e repete a mesma fixture na implementação atual. Foram comparados **82 estados × 14 superfícies**, nas nove resoluções da auditoria: porto, chat/expedição abertos e fechados, três menus exclusivos, widget recolhido, combate com dois/três slots e pausa.

**Resultado: nenhuma diferença de x, y, largura, altura ou visibilidade**, tolerância de 0,1 px. A primeira comparação também reproduziu os 63 estados registrados antes da edição, sem diferenças. O relatório JSON e as capturas são evidências temporárias, não arquivos do produto.

As superfícies comparadas são menu principal, ações, chat, expedição expandida, jornada compacta, botão do canal, explorar/retornar/rota, mini-expedição, XP/h e os três menus suspensos.

## Arquivos e validação

Produção: `creation-selection.js`, `creation-selection.css`, `gameplay-harmony.css`, `game.js`, `index.html`, `ui-preview.html`, `tools/build_pages.py` e `assets/ui/creation-hd/`.

Testes: `creation-selection.test.cjs`; navegador de criação (sete classes, 42 especiais, quatro facções, nove resoluções, troca rápida, rascunho, confirmação e reload); emblemas/seleção (quatro facções salvas, oito resoluções); controles (menus exclusivos, anotações locais, proteção dos atalhos ao digitar, L, janela de taxas, atividade e recolhimento); comparação de geometria. A revisão automática está em `.github/workflows/creation-harmony.yml`.

Regressão Node: 14 arquivos pertinentes, 42 testes reportados, todos passaram — aparência, atributos, talentos/finais, notificações, menus, HUD/XP por hora, componentes, preparação/carregamento e Rank S. Build: `python tools/build_pages.py`.

Limites: telas curtas usam rolagem; a grade se reorganiza em resoluções menores. Anotações mantêm a semântica local já existente, sem criar chat online ou um novo armazenamento. Esta sprint não altera renderização, sprites ou balanceamento e não faz promessa de aumento de FPS.

## Mapeamento dos seis especiais

| Classe | Três intermediários | Três finais |
|---|---|---|
| Espadachim (`sword`) | Fio Desgastante · Ímpeto Sanguinário · Aparar Perfeito | Aura Demoníaca (Asura) · Execução Absoluta · Corte Espacial |
| Lutador (`brawler`) | Impacto Concussivo · Fúria da Batalha · Golpes Crescentes | Corpo de Titã · Pele de Armamento · Imortalidade Temporária |
| Atirador (`gunner`) | Tiro de Longo Alcance · Munição Perfurante · Foco Extremo | Artilharia Pesada · Camuflagem Óptica · Mestre do Ricochete |
| Gatuno (`rogue`) | Lâminas Envenenadas · Mãos Leves · Golpe Furtivo | Marca do Assassino · Clone das Sombras · Senhor do Submundo |
| Ciborgue (`cyborg`) | Escudo de Energia · Núcleo Instável · Armadura Adaptativa | Overclock de Sistemas · Matriz de Aniquilação (EMP) · Canhão Orbital |
| Estrategista Elemental (`strategist`) | Eco Arcano · Congelamento Estático · Sifão de Mana | Cataclismo Passivo · Domínio do Arquimago · Singularidade |
| Suporte (`healer`) | Cura em Corrente · Aura de Revigoramento · Intervenção Divina | Benção Eterna · Anjo Guardião · Vínculo Empático |
