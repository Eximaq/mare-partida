# Kaizoku Idle — portal de pré-lançamento

Página pública em `portal/index.html`, solicitada em 29/10/2026. Identidade pública: **Kaizoku Idle**. Domínio informado pelo proprietário: **https://kaizokuidle2d.com.br**. O código interno e o nome histórico do repositório continuam preservados.

## Comportamento

Cenário náutico original em pixel art, nova logo, aviso “Em desenvolvimento” e mensagem “Nos vemos em breve a bordo”. A mensagem da tripulação usa `details/summary` nativos, operáveis por teclado e sem JavaScript. Sem coleta de e-mail, contas, login, prazo inventado ou chamada para jogar uma versão pública.

O fundo `ocean-art.css` e os assets anteriores não foram modificados. O jogo, saves e a entrada local `index.html` continuam intactos.

## Publicar na Cloudflare Pages

Para este domínio, publicar **somente o portal**:

- Repositório: `Eximaq/mare-partida`.
- Framework: nenhum.
- Comando de build: `python tools/build_portal.py`.
- Diretório de saída: `dist-portal`.
- Diretório raiz do projeto: raiz do repositório.
- Branch de produção: `main`, depois da revisão e merge do PR. A branch `feature/portal-em-breve` serve para preview.

O build é independente do diretório atual e usa uma lista explícita de arquivos públicos. Recusa saída dentro dos fontes ou com arquivos desconhecidos; não remove pastas existentes. A raiz redireciona temporariamente para `/portal/` por `_redirects` (302), com fallback HTML relativo para servidores estáticos comuns. Os assets recebem hash de conteúdo e o HTML é revalidado para evitar cache antigo.

Depois do deploy, no projeto Pages, abrir **Custom domains → Set up a domain** e adicionar `kaizokuidle2d.com.br`. Seguir a validação de DNS/nameservers exibida pela Cloudflare; não inventar valores. Para domínio raiz, a zona precisa estar na conta Cloudflare. Não basta adicionar um CNAME sem associar o domínio ao projeto. Aguardar o estado ativo e conferir HTTPS e o redirecionamento.

Referências: [HTML estático](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) e [domínios personalizados](https://developers.cloudflare.com/pages/configuration/custom-domains/).

O fluxo existente de GitHub Pages continua usando `python tools/build_pages.py`, mantendo o jogo na raiz e o portal em `/portal/`. **Não usar esse pacote completo no domínio de pré-lançamento.**

## Preview e pacote local

```powershell
python tools/build_portal.py
python -m http.server 8831 --bind 127.0.0.1 --directory dist-portal
```

Abrir `http://127.0.0.1:8831/`; deve terminar em `/portal/`. O ZIP local `dist-portal.zip`, quando gerado, contém o pacote para upload manual; saída e ZIP não entram no Git.

## Logo oficial e recorte

O portal usa agora `portal/assets/logo-kaizoku-idle-oficial.png`, PNG RGBA transparente de 2005×784. Fonte fornecida pelo proprietário: `Emblema Pirata Kaizoku Idle.png`. A ferramenta integrada ImageGen extraiu o conjunto do nome e seus elementos ligados às letras, removendo fundo branco, mar, navios, ilhas e moldura circular. Nenhum crédito PixelLab foi usado.

Prompt final (extração): “Extract ONLY the existing two-line title artwork reading KAIZOKU / IDLE. Keep the original letter shapes, cyan-blue lettering, gold bevels, gold IDLE lettering, dark outlines, integrated skull-and-hat O, hat on K and rope flourishes. Remove the white background, circular border, sky, clouds, birds, sea, islands and ships. Genuine alpha transparency, including holes between letters; tightly cropped, no redesign or new elements.”

A primeira logo gerada, `logo-kaizoku-idle.png`, foi preservada como histórico e não é mais referenciada pela página.

## Correção de cache no Pages — 29/10/2026

O HTML publicado pelo GitHub Pages não versionava os assets do portal, embora o build Cloudflare já o fizesse. Com CSS antigo, o novo HTML exibia a logo em 1448 px e o cabeçalho em bloco, reproduzindo a captura enviada pelo proprietário.

`version_portal_assets` agora é compartilhada pelos dois builds. As URLs de CSS e imagens levam hash do conteúdo; saves, gameplay e o fundo aprovado não mudam.

Validação da correção: 3 testes de build passaram (a regressão falhou antes do patch), 106 arquivos Node passaram, ambos os builds passaram e `python tests/portal_pages_cache_browser.py` verificou os dois pacotes em 1920, 1366, 1280, 390 e 320 px com uma resposta antiga simulada para o CSS sem versão. Nenhum dos pacotes corrigidos pediu esse CSS antigo; imagens, layout, teclado e preservação de storage passaram. Capturas atuais em `docs/evidence-portal-cache/`, fora do Git.

## Validação e limites — 29/10/2026

- `python tests/portal_build_test.py`: 2 testes passaram; pacote repetível, links locais válidos, ausência de gameplay/JS/fontes locais e recusa de destino contaminado ou dos fontes.
- 106 arquivos Node do fluxo de CI passaram; `supa-browser.test.cjs` é E2E e foi excluído conforme o próprio CI.
- `python tools/build_pages.py` e `python tools/build_portal.py`: passaram.
- Chromium em sessão `kaizoku-portal`: raiz → portal, imagens carregadas, zero formulários, zero rolagem horizontal nas sete telas 1920×1080, 1366×768, 1280×720, 1024×768, 768×1024, 390×844 e 320×740.
- Mensagem abre/fecha com Enter; movimento reduzido desativa a animação da logo; nenhum erro de página registrado.
- Axe 4.12.1: zero violações automáticas; contraste de texto com sombra/ornamentos exige inspeção visual e foi revisado nas capturas. Isso não equivale a certificação integral de acessibilidade.
- Capturas locais atuais: `docs/evidence-portal/` (ignoradas pelo Git).
- O domínio não foi confirmado online; não foi possível acessar o painel Cloudflare nesta sessão. Nenhum deploy, DNS, nameserver ou merge foi executado.
- Fonte Pixelify Sans vem do Google Fonts, com fallback local; texto e interação continuam funcionando sem essa conexão.

Rollback: reverter o commit da tarefa; em hospedagem, selecionar a implantação anterior. Nenhuma migração de save.
