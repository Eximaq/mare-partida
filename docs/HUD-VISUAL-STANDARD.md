# Padrão visual das próximas HUDs

Diretriz permanente do proprietário: manter nas próximas HUDs o padrão apresentado no PR #167. Esta referência deve ser lida antes de criar ou reformular interfaces do jogo; mudanças posteriores explicitamente solicitadas pelo proprietário prevalecem.

## Referência de implementação

- Composição e integração: character-hud.js, ui-hud.css e index.html.
- Artes reutilizáveis e origem: assets/ui/character-hud/hd/manifest.json.
- Emblemas oficiais: assets/ui/faction-emblems/; preservar os originais.
- Auditoria e critérios: [HUD HD e Hierarquia dos Mares](HUD-HD-HIERARCHY.md).

## Direção artística

Manter madeira escura detalhada, pergaminho envelhecido, acabamento metálico dourado, cordas náuticas e ornamentos proporcionais. Preservar a qualidade HD das texturas, contornos e transparência. Adaptar a organização à finalidade de cada HUD, sem repetir o cartaz WANTED onde ele não fizer sentido.

Reutilizar primeiro as artes e componentes adequados. Quando houver necessidade de novas artes, utilizar PixelLab AI como ferramenta principal, seguindo a mesma linguagem visual. Validar uma amostra no tamanho real de exibição antes de expandir um lote; registrar origem, dimensões e custo.

Não esticar molduras, âncoras, cordas ou medalhões. Manter a proporção dos arquivos, separar ornamentos e superfícies quando necessário e preservar os fontes na resolução original. Conferir se a transparência não removeu materiais interiores. Não ampliar imagens pequenas para aparentar resolução HD, nem utilizar capturas comprimidas como assets finais.

## Conteúdo e legibilidade

- Informações, nomes e títulos devem vir dos sistemas existentes e permanecer como texto dinâmico; não gravar valores fictícios nas artes.
- Alabasta Pirate identifica o nome do personagem. Para valores e títulos longos, usar tipografia compacta e legível, ajustada à área livre dos ornamentos.
- Manter a identidade cromática da hierarquia: vermelho pirata, verde revolucionário, azul Marinha e branco/marfim Governo Mundial.
- Usar o compositor atual para retratos reais, preservando aparência e equipamentos. Não copiar o retrato antigo de baixa resolução ou acrescentar cenários e efeitos não solicitados.
- Na HUD do personagem, nome e retrato ficam exclusivamente no cartaz e Bounty permanece vazia até nova instrução explícita.

## Integração e validação

Integrar as fontes de dados, persistência, carregamento e cache existentes. Não recriar sistemas nem gerar artes durante o gameplay. Carregar apenas os recursos necessários ao estado atual e preservar o versionamento de arquivos do build.

Antes de publicar, revisar capturas reais no navegador em desktop e mobile, incluindo textos longos, estados vazios, valores extremos, foco de teclado, toque, sobreposições, recortes e nitidez. Testar as funcionalidades afetadas e apresentar uma prévia. Este padrão visual não autoriza novas mecânicas, mudanças de progressão ou reformas de outras HUDs sem solicitação.

## Padrão aprovado para fundos — madeira e metal escuro (31/10/2026)

Orientação explícita do proprietário: utilizar a mesma arte de madeira e metal escuro da Forja no lugar dos fundos verdes lisos. Esta é a base visual para as próximas artes e interfaces, incluindo campos de busca, filtros, seletores, superfícies de painéis e áreas de materiais/resultados.

- Arquivo reutilizável: `assets/ui/forge-hd/workshop-surface.png`, PixelLab AI Pro, 512×512 nativo.
- Origem, prompt, hash e custo: `assets/ui/forge-hd/manifest.json`, job `4b9e68be-ad20-4b62-924c-cd837708266b`.
- Reutilizar o arquivo aprovado antes de gerar outro fundo. Exibir em tamanho nativo, com recorte/repetição e veladura escura discreta quando necessário à leitura.
- Preservar a textura artesanal, a madeira escura, o metal envelhecido e a iluminação quente contida. Não retornar às superfícies verdes/azuladas lisas.
- Conferir o estilo calculado dos campos: o tema compartilhado antigo pode recolocar `navigator/ink.webp` por precedência de seletores. O fundo efetivo deve usar a nova arte.
- Cores semânticas de sucesso, risco e raridade continuam distintas; o padrão se refere às superfícies de fundo.
- A Forja aplica esta regra nas quatro abas. Outras interfaces existentes serão adaptadas quando solicitadas; a orientação fica registrada para toda nova arte.

Token compartilhado: `--rpg-workshop-surface`, definido em `ui-tokens.css`. Novas HUDs devem reutilizá-lo para manter a mesma arte e evitar cópias ou novas gerações desnecessárias.


## Personagem e aparência compartilhada — 31/10/2026

As telas de status e aparência reutilizam os materiais acima. A criação e a edição posterior usam o mesmo componente; o título e o emblema acompanham a facção. Referência de integração, arte PixelLab e validação: [PERSONAGEM-STUDIO-HD.md](PERSONAGEM-STUDIO-HD.md). Ícones de classe seguem a família dos dois recortes aprovados do Espadachim; nomes e números continuam como texto dinâmico.
