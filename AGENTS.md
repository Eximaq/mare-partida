# Guia do Codex — Maré Partida

Leia e respeite `AGENT.md` (guia principal, mantido pelo usuário), `README.md` e os documentos pertinentes em `docs/` antes de alterar sistemas.

- Fonte da verdade: arquivos atuais deste repositório; preserve alterações manuais e commits de colaboradores.
- Trabalhe em branches nomeadas `feature/...` ou `fix/...`; não reescreva `main`.
- Evite incluir dados pessoais, saves, credenciais, evidências de teste em massa ou arquivos locais no repositório.
- Execute testes Node pertinentes e confira o jogo no navegador antes de propor merge.
- Verifique `git status` antes de editar e antes do commit; não sobrescreva trabalhos não commitados de outro desenvolvedor.
- Para publicar o preview estático, mantenha caminhos relativos e execute `python tools/build_pages.py`.

## Publicação ao concluir cada atualização

Orientação permanente do proprietário, registrada em 18/10/2026: ao concluir uma atualização solicitada, validar a mudança, criar um commit e fazer push para `https://github.com/Eximaq/mare-partida` antes da entrega final. Esta instrução autoriza os commits/pushes das atualizações pedidas; não solicitar novamente a mesma autorização.

- Seguir o fluxo existente: branch `feature/...` ou `fix/...`, push e Pull Request para `main`. Informar o link e o resultado dos testes na entrega.
- Preservar alterações de colaboradores e trabalhos locais fora da tarefa; incluir no commit somente o escopo validado.
- Não fazer force-push nem merge automático sem autorização específica.
- Não incluir saves, credenciais, caches, arquivos locais ou evidências em massa.
- Se autenticação, conflito ou rede impedir o envio, informar claramente que o push não foi concluído; não declarar uma publicação inexistente.
