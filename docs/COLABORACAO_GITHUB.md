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
- Antes de trabalhar: confira `git status --short` e atualize as referências com `git fetch origin`. Preserve qualquer alteração local de outro desenvolvedor; use uma pasta isolada quando necessário.
- Nova tarefa: com a árvore limpa, `git switch -c feature/nome-da-tarefa origin/main` (ou `fix/...`).
- Depois de testar: adicione explicitamente apenas os arquivos da tarefa, crie o commit e faça `git push -u origin feature/nome-da-tarefa`.
- Abra o Pull Request, revise o diff com a `main` atual e confira os checks do commit que será integrado. Resolva conflitos sem descartar o trabalho do colaborador e execute novamente as verificações afetadas.
- Por orientação do proprietário em 02/11/2026, uma atualização validada deve terminar com merge normal e publicação no GitHub Pages, salvo restrição posterior explícita. Respeite revisões/proteções exigidas; não faça bypass. Confirme o workflow e abra o site publicado antes de declarar a entrega.
- Encerre PRs substituídos após auditar as diferenças, registrando onde o trabalho foi preservado. Não apague branches por padrão e não integre arte ainda em avaliação. A consolidação atual está em [SERVER-DELIVERY-CONSOLIDATION.md](operations/SERVER-DELIVERY-CONSOLIDATION.md).
- Nunca use `git push --force` para sobrescrever alterações do amigo.

## Prévia local

Use `python tools/dev_server.py` e abra a URL indicada, ou `python tools/build_pages.py` para preparar `dist/` para hospedagem. `dist/` fica fora do Git e é reconstruída no CI.

## Limitações

- GitHub Pages executa apenas o frontend estático; não hospeda servidor MMORPG em tempo real.
- A demonstração estática utiliza `localStorage`: saves são específicos de cada navegador/origem. O modo online usa o backend e PostgreSQL; a instalação contínua permanece local e não torna o colaborador acessível pela Internet.
- A publicação estática não autoriza hospedar o backend, alterar Supabase/DNS ou contratar serviços. Essas ações seguem seu escopo específico.
- Source code e imagens de um repositório público ficam acessíveis a terceiros. Confira direitos de assets/personagens antes de publicar comercialmente.
- Não publique tokens, contas, arquivos `.env`, backups do jogo, saves pessoais, arquivos locais de credenciais ou arquivos brutos grandes de evidências.
