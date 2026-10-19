# Laboratório DEV temporário

Use o botão **DEV**, acima da barra de habilidades, ou **F8**, e escolha **Abrir laboratório**. No celular, use o botão. Um aviso permanente e o título `[DEV]` identificam a sessão.

## Save separado

O laboratório abre `?dev=1`, clona a aventura e usa exclusivamente `mare-partida-dev-save-v1`. A aventura continua em `mare-partida-save-v1`. Recarregar retoma o laboratório; **Voltar ao jogo normal** retorna ao progresso original. **Recriar cópia do save normal** pede confirmação e substitui somente os testes. Exports DEV são identificados e só podem ser importados no laboratório. Nenhum dado de teste é sincronizado com a aventura normal.

## Controles disponíveis

- Definir nível 1–200, trocar entre sete classes com arma inicial apropriada, devolver atributos e obter suprimentos.
- Preparar nível 50 com Livro da Vontade, consumir o livro automaticamente para despertar, voltar ao bloqueio, alterar Vontade e abrir a aba HAKI.
- Preparar builds válidas com 50 PT no primeiro ramo, um intermediário e um final opcional; devolver talentos; preparar metas e resgatá-las pela interface real de Conquistas.
- Criar equipamentos com raridade, nível e refino; pérolas, caixas e livros mantêm suas definições. Quantidade máxima por operação: 25; mochila: 120.
- Restaurar recursos, deixar HP em 20%, limpar recargas, alternar invencibilidade, Vontade infinita e ausência de recargas. Desligue essas opções ao testar esgotamento e efeitos defensivos.
- Viajar aos dois mapas existentes, criar comuns/chefes próximos em terreno livre com linha de visão, limpar inimigos e suspender novos spawns por 60 segundos.
- Ajustar andares concluídos na **prévia** de Impel Down. O modo continua indisponível; não cria partidas nem recompensas fictícias de sistemas futuros.

Reduzir nível pode remover investimentos que ultrapassem o novo orçamento, somente no save DEV. Trocar classe guarda a arma anterior na mochila e exige espaço. Os comandos de estado persistem antes de substituir a sessão; erros de armazenamento cancelam a alteração.

## Arquitetura e remoção

`dev-tools.js` concentra seleção de chave, cópia, validação de comandos e renderização. `game.js` integra combate, sessão e eventos. As opções especiais exigem `DEV_ACTIVE`; não atuam na aventura normal. `suppressSave` impede que eventos de saída sobrescrevam imports, resets ou a cópia recém-criada.

Para desativar o acesso temporário, altere `ENABLED` para `false` em `dev-tools.js`. Isso oculta o botão e desabilita o parâmetro DEV, sem apagar saves. Este laboratório é uma ferramenta local de um protótipo offline, não um sistema de autorização para um futuro servidor multiplayer.

## Verificação

`node tests/dev-tools.test.cjs` cobre isolamento, limites, sete classes/21 finais, Haki, mochila e restrições futuras. `python tests/dev_tools_browser.py` usa Chromium isolado para ações reais, cópia/retomada/saída, recópia, combate e cinco resoluções. O pipeline estático inclui o módulo e aplica hash de conteúdo como aos demais scripts.
