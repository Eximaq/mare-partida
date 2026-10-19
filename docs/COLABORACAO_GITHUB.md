# Maré Partida — GitHub, colaboração e preview

## Objetivo

Uma cópia do código para os dois desenvolvedores, sem ZIPs a cada mudança. A branch `main` é a versão estável; novas alterações entram por branches e Pull Requests.

## Preparar o repositório (uma única vez)

1. Entre em https://github.com/new com sua conta `Eximaq`.
2. Nome sugerido: `mare-partida`. Escolha **Private** para manter o código reservado enquanto desenvolvem. Se quiser Pages no GitHub Free, revise os requisitos de publicação do seu plano e a visibilidade apropriada.
3. Crie **sem** README, .gitignore ou licença, pois estes arquivos já vêm no pacote.
4. Abra a pasta deste pacote em um terminal com Git instalado e execute:

   ```bash
   git init -b main
   git add .
   git commit -m "feat: importar Maré Partida com base colaborativa e Pages"
   git remote add origin https://github.com/Eximaq/mare-partida.git
   git push -u origin main
   ```

   Caso crie um repositório com outro nome, substitua o link acima pelo seu link real.

5. No repositório, abra **Settings → Collaborators → Add people** para convidar o amigo via username.
6. Para publicar a demonstração estática: **Settings → Pages → Build and deployment → Source: GitHub Actions**. A action `.github/workflows/pages.yml` publicará a cada push na `main`, se Pages estiver habilitado para o repositório.
7. Confira **Actions** e **Settings → Pages** para obter a URL efetivamente publicada. Não assuma que está no ar até existir deploy bem-sucedido.

## Atualização diária

- Ambos clonam o mesmo repositório uma vez: `git clone https://github.com/Eximaq/mare-partida.git`.
- Antes de trabalhar: `git checkout main && git pull`.
- Nova tarefa: `git checkout -b feature/nome-da-tarefa`.
- Depois de testar: `git add . && git commit -m "descreva a mudança" && git push -u origin feature/nome-da-tarefa`.
- No GitHub, abra um Pull Request para `main`; o outro desenvolvedor revisa. Faça merge depois dos testes.
- Nunca use `git push --force` para sobrescrever alterações do amigo.

## Prévia local

Use `python tools/dev_server.py` e abra a URL indicada, ou `python tools/build_pages.py` para preparar `dist/` para hospedagem. `dist/` fica fora do Git e é reconstruída no CI.

## Limitações

- GitHub Pages executa apenas o frontend estático; não hospeda servidor MMORPG em tempo real.
- O jogo atual utiliza `localStorage`: saves são específicos de cada navegador/origem e não são sincronizados entre os dois desenvolvedores.
- Source code e imagens de um repositório público ficam acessíveis a terceiros. Confira direitos de assets/personagens antes de publicar comercialmente.
- Não publique tokens, contas, arquivos `.env`, backups do jogo, saves pessoais, arquivos locais de credenciais ou arquivos brutos grandes de evidências.
