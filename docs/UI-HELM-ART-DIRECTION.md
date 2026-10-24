# Direção de arte — Cabine do Navegante (HUD / UI visual)

## Intenção

Camada de apresentação `ui-art-direction.css`, carregada **depois** do CSS existente. Não substituir mapa, sprites, inventário, referências DOM nem alterar `game.js`. Tema **fantasia marítima original**, com materiais náuticos associados ao mundo Maré Partida, sem replicar iconografia protegida.

### Sistema de materiais

| Papel | Valor | Uso |
|---|---|---|
| Madeira de convés | `#412c20` com tábuas discretas | Barra de habilidades, menu, cabeçalhos |
| Bronze de ferragem | `#b58b4b` | Aros, separadores, contornos |
| Bronze polido | `#e2c58e` | Foco e pontos de atenção |
| Cabine verde-marinho | `#172e32` / `#101f24` | Conteúdos escuros |
| Pergaminho | `#e1cd9f` | Conteúdos originais do inventário |
| Corda clara | `#b69b6c` | Motivos sutis e separadores |

Tipografia deliberada: **Georgia/Palatino** nos títulos de diário e janelas, mantendo Segoe UI/Trebuchet para leitura longa e números. Fontes de sistema, com suporte a português e sem dependências externas. Sprites originais permanecem `image-rendering:pixelated`.

### Composição intencional

- **Topo esquerdo**: painel de personagem com faixa “Diário de bordo”, retrato enquadrado, recursos em barras esculpidas, ouro e nível.
- **Topo direito**: menu de ícones pixel art sobre madeira, cada ação encaixada em nicho verde-marinho.
- **Rodapé centro**: barra de habilidades como console de navio, legendas das teclas visíveis apenas em desktops altos; sem aumentar botões no celular.
- **Rodapé direito**: expedição como livro de bordo compacto, texto claro e progresso.
- **Janelas funcionais**: molduras de bronze e títulos editoriais; inventário preserva as áreas de pergaminho, forja mantém seu layout transacional, diário e configurações usam a navegação existente.

### Crítica de soluções rejeitadas

- Não usar layout de cartão SaaS arredondado, menu administrativo ou gradiente decorativo genérico.
- Não ampliar irrestritamente barra de habilidade (ela disputa espaço com o mapa em 360px).
- Não criar imagens, mapas, ícones ou fontes externos.
- Não introduzir `!important` ou copiar estilos para arquivos legados.

### Contratos / teste de aceitação

1. `node tests/ui-art-direction.test.cjs` — verifica conexão do tema, suporte mobile e ausência de override `!important`.
2. `node tests/ui-foundation-contract.test.cjs` — checa controle de toque e áreas seguras.
3. Todas as suítes Node e `python tools/build_pages.py`.
4. **Pendente:** navegador real comparando `360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900`, além de `390×667`, `844×390`, teclado e toques. Conferir mundo legível, popovers, janelas, botões, recursos e ausência de rolagem horizontal.
5. **Pendente:** aprovação visual do proprietário após screenshots da UI real. Prévia conceitual isolada não conta como screenshot de produção.

Esta etapa implementa uma **primeira direção estética visivelmente diferente**, mas **não conclui** todas as janelas, ícones e tipografia final. A evolução dos painéis terá PRs separados e observações visuais reais.
