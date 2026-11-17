# Armazenamento das evidências de CI

Capturas e pacotes de diagnóstico expiram após três dias. Testes continuam rodando
normalmente, mas seus uploads acontecem somente em falha, execução manual
(`workflow_dispatch`) ou execução de PR com a label `preserve-evidence`.
Para solicitar capturas de uma execução bem-sucedida, adicione a label antes de
executar/reexecutar o workflow. A label não aumenta a retenção: baixe as evidências
importantes antes de expirarem. Logs e resultados dos checks continuam disponíveis
conforme a política do repositório.

O upload de GitHub Pages é independente e permanece inalterado. Não alterar
orçamentos, caches, código, assets ou saves para liberar a cota de artefatos.
O teste `python tests/artifact_retention_test.py` (PyYAML 6.0.3) verifica todos os
uploads de diagnóstico, evitando regressão para uploads incondicionais/90 dias.

Na limpeza autorizada de 16/11/2026, o inventário tinha 4.840 artefatos (80,87 GiB
informados pela API). O plano preserva 476 (9,97 GiB): o mais recente de cada nome,
todos os artefatos das branches dos dez PRs abertos e os criados desde 15/11 UTC.
Somente os outros 4.364, antigos e substituídos, são candidatos à remoção.
O inventário, o plano com IDs e o recibo de cada DELETE ficam fora do Git em
`actions-evidence-20261116`, na pasta MARE do operador. O recibo registra o resultado
real; o plano não é prova de exclusão concluída. Não se removem runs nem seus logs.

A retenção nova não altera retroativamente os artefatos anteriores. A limpeza não
zera uso já acumulado no ciclo de cobrança; a franquia pode continuar excedida pelas
evidências preservadas. Nenhuma liberação de gastos faz parte desta política.
