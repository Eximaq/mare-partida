# Validação da sprint Haki — 01/11/2026

Branch: `feature/haki-mastery-hd`. Base auditada: `68ea929`. Trabalho isolado do checkout local com alterações não commitadas. Atualizações de colaboradores até `0c0e448` incorporadas sem conflito.

## Resultado funcional

- 143 suítes Node aprovadas (a regressão longa de navegação de monstros foi executada isoladamente, 87,98 s). Testes novos de domínio: validação de sequência, dependências, limites, portão completo, materiais por ramo, pilhas/bag cheia, bloqueio, persistência atômica, falha de gravação e confirmação obsoleta.
- Regressão Haki: H/J/K, exclusividade, auto no primeiro contato, Vontade, esgotamento, recuperação, alcance/linha de visão do Conquistador, diferença entre comuns e chefes e cooldown persistido.
- Testes de Logia: redução específica contornada somente nas condições ofensivas previstas; cálculo de defesa preservado; Observação/desligamento não habilitam a exceção; categoria mágica e caminho Ryu preservados.
- Testes de arte: 19 PNGs distintos com alfa real; 3 animações com quadros distintos, pivôs/dimensões coerentes; Conquistador com último quadro vazio e cobertura controlada.
- Testes Python gerais: 161 aprovados, incluindo preservação de 7.285 quadros nativos de personagens.
- Browser de Supa no pacote estático: aprovado, incluindo dano físico/mágico/direto, escudo e expiração.
- Browser Haki: fluxo real do livro, investimento por confirmação, quotas/rollback, confirmação obsoleta, gate, reload, rota própria, H/J/K, estado temporário, porto, morte e migração antiga pendente.
- Comparação de geometria da HUD existente: 82 estados × 14 superfícies, 9 viewports, sem diferenças. O comparador histórico carrega os módulos Haki da mesma revisão do HTML antigo; não mistura a dependência nova com uma tela que ainda não a declarava.
- Matriz de viewport: 1920×1080, 1366×768, 1280×720, 1024×768, 393×852, 320×568 e 844×390. Sem overflow horizontal da janela e com fechamento acessível.
- Capturas reais do compositor: masculino/feminino, quatro direções, três manifestações e Fênix. Esses mosaicos usam os renderizadores do jogo; não são mockups gerados.
- Combate simulado com o relógio de teste do navegador: 42 abates no ensaio de 120 s e 21 no ensaio final de 60 s. Inventário/progresso e retorno foram exercitados sem fontes novas.

## Duração dos frames

A medição usa **outra página com RAF nativo**, sem o relógio acelerado dos testes funcionais. Chrome headless no Windows, 1672×1086, sem inimigos, 2,5 s por condição, após carregar as imagens.

| Condição | p50 | p95 | p99 | Máximo |
|---|---:|---:|---:|---:|
| Sem manifestação | 33,3 ms | 33,6 ms | 33,6 ms | 50,2 ms |
| Armamento | 16,8 ms | 33,5 ms | 33,6 ms | 33,6 ms |
| Observação | 16,7 ms | 33,4 ms | 33,5 ms | 33,5 ms |
| Conquistador | 16,7 ms | 33,4 ms | 33,5 ms | 50,1 ms |

A amostra é curta e sujeita a aquecimento/agendamento do host: não demonstra aumento de FPS nem garante desempenho de todos os dispositivos. Não houve aumento observado do p95/p99 em relação à referência desta amostra. Permaneceram 3 imagens de efeitos carregadas, 3 canvases na página antes/depois e nenhum efeito/projétil residual no cenário isolado.

## Publicação e limites

Build obrigatório: `python tools/build_pages.py`. Browser exercitado no código fonte, com o serviço Python e no `dist` estático. Pipeline próprio em `.github/workflows/haki-mastery.yml` publica capturas como artefato de CI; evidências e saves locais ficam fora do Git.

Quests, drops, lojas e compensações **não foram criados**. Custos ainda provisórios. A migração de saves antigos foi preparada com histórico recuperável, acesso temporário pelo mesmo motor e aviso visível; aplicar a política de compensação/Rei depende da decisão do proprietário.

Consulte [DOMINIO.md](DOMINIO.md), [AUDITORIA.md](AUDITORIA.md) e [PENDENCIAS_HAKI.md](PENDENCIAS_HAKI.md). Próxima sprint mínima: definir a política de legado e as fontes de treinamento antes de abrir a nova progressão na jornada normal.
