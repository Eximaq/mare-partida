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
