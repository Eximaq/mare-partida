# CODEX-LESSONS — prevenção de erros recorrentes

**Lições curadas, não memória de conversa.** Leitura opcional apenas na tarefa correspondente; máximo de 12 entradas ativas. Para cada nova lição: incidente observável + causa verificável + teste/guarda. Não duplicar as regras longas de `AGENTS.md`.

| Incidente rastreável | Causa / limite conhecido | Salvaguarda de engenharia |
|---|---|---|
| [PR #74](https://github.com/Eximaq/mare-partida/pull/74) — ornamentos do portal rejeitados; [PR #75](https://github.com/Eximaq/mare-partida/pull/75) reverteu apresentação | Assets separados foram integrados sem validação visual satisfatória do conjunto | Para arte/UI: composição e captura real primeiro; **aprovação do proprietário** antes de aplicar o lote; HTML interativo separado dos sprites |
| [PR #53](https://github.com/Eximaq/mare-partida/pull/53) — mudança de inimigos de Dawn com falhas de regressão | Regras de progressão e expectativas de testes divergiram; também existiu uma falha no teste do aviso de ataque | Confirmar o contrato de produto, reproduzir a falha no navegador e atualizar o teste só com evidência; aceitar como pendência se ainda falha |
| [PR #85](https://github.com/Eximaq/mare-partida/pull/85) — workflow essencial falhava por `playwright` ausente | Um teste E2E com dependências/servidor foi executado como Node autônomo | Separar a execução por ambiente. **A exclusão do E2E do loop Node não é evidência de que o E2E passou**; manter verificação específica de navegador antes de declarar cobertura total |
| [PR #39](https://github.com/Eximaq/mare-partida/pull/39) — branch antiga pausada | Trabalho histórico experimental não se mantém automaticamente compatível com mudanças posteriores | Não mesclar branch pausada; comparar nomes de arquivos/contratos e revalidar base antes de retomar |
| [PR #57](https://github.com/Eximaq/mare-partida/pull/57) — conjunto Paper Doll vestido em revisão | Cobertura técnica e teste visual não equivalem a aprovação artística/produção | Manter `approved:false`, `productionEnabled:false` e fallback até aceitação expressa do proprietário |

## Como atualizar após uma atividade
1. Se houve erro, guardar no PR o **menor cenário de reprodução**, a causa comprovada e o teste.
2. Só adicionar entrada nesta tabela quando o problema se repetir, causar dano relevante ou revelar ausência de proteção.
3. Não escrever “a IA aprendeu para sempre”: a melhoria só persiste se a regra for lida na tarefa pertinente **ou** um teste/CI a exigir.
4. Remover/revisar lição quando mudar arquitetura ou prova técnica; limitar histórico e não copiar logs.

**Quando consultar:** revisão visual -> PR #74; atualização de regra/teste -> PR #53; CI/browser -> PR #85; colaboração/branches -> PR #39; animação -> PR #57. Não é necessário ler esta tabela numa alteração puramente textual.
