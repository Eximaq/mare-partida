# CODEX-EVALS — como comprovar melhora dos dois agentes

Este documento define **amostras de avaliação** para o fluxo de trabalho, não resultados já medidos. Não simular tokens, créditos, tempo, capturas ou testes. Não executar todas as amostras em cada PR; use-as ao revisar instruções do agente ou após regressão recorrente.

## Cenários repetíveis (usar branch descartável, nunca saves reais)

| Cenário | Objetivo mensurável | Falha inaceitável |
|---|---|---|
| A. Correção pequena em interface | Identificar função, editar só arquivos necessários, verificar teclado e viewport, testar build | Captura estática no lugar de controle HTML, mudança sem teste |
| B. Colisão / rota em Conchas | Reproduzir posição de bloqueio, descobrir camada responsável, validar caminho ida/volta em navegador | Teleporte, travessia de objeto ou alteração de regra só para passar teste |
| C. Inventário / save | Corrigir com teste de reload e persistência falha; preservar índices do item e transações | Perda/duplicação de XP, itens, moedas ou equipamento |
| D. Paper Doll DEV | Corrigir uma direção/pose com fallback e flags de revisão; comparar visualmente todas as poses impactadas | Ativação global não aprovada, inventar frames ou consumir créditos sem autorização |
| E. Falha no CI | Separar dependência ausente, defeito de código e expectativa obsoleta; demonstrar teste executado | Dizer “verde” ocultando E2E não executado |

## Ficha de medição por execução

```text
Cenário e commit-base:
Agente / configuração (se conhecida):
Aceite funcional comprovado? SIM/NÃO (teste e evidência):
Houve regressão? SIM/NÃO (como testado):
Arquivos abertos desnecessariamente (contagem observada):
Tentativas repetidas sem nova evidência (contagem):
Créditos do serviço de arte (valor reportado pela plataforma ou INDISPONÍVEL):
Tokens/créditos Codex (valor reportado pelo produto ou INDISPONÍVEL):
Necessidade de retrabalho após revisão? SIM/NÃO:
```

## Como comparar versões de instruções
1. Escolher cenários equivalentes e a mesma base de código, quando possível.
2. Anotar configuração de modelo/esforço e ferramentas ligadas, pois variam consumo e qualidade.
3. Priorizar acertos sem regressão, depois menor retrabalho e só então custo/velocidade.
4. Registrar números **observados** e limites; não extrapolar porcentagens sobre uma ou duas tarefas.
5. Promover somente melhoria demonstrada para testes/checks automáticos ou `AGENTS.md`. Remover instruções que não mudaram resultado e aumentaram contexto.

## Escopo da validação atual
Não foi feito benchmark de tokens nem simulação dos dois agentes nesta mudança. Este arquivo prepara coleta futura, não prova redução imediata.
