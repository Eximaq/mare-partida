# Pendências de Haki

## HAKI-QUEST-DROPS

**Status: PENDENTE DE DEFINIÇÃO DO PROPRIETÁRIO**

As árvores, os investimentos e os três materiais de fragmento existem funcionalmente. Suas fontes oficiais de obtenção ainda **não foram definidas nem implementadas**.

Falta definir e implementar:

- Quests de treinamento de Armamento e Observação.
- Quests e fases avançadas próprias do Conquistador.
- Locais, inimigos, elegibilidade, quantidades, frequência e chances.
- Ritmo de progressão e validação dos custos provisórios.

Não adicionar fragmentos automaticamente a lojas, monstros, conquistas, login, correio ou receitas sem nova orientação. O proprietário implementará essas fontes no momento apropriado. O laboratório DEV separado é somente um mecanismo de teste.

Em futuras auditorias sobre o que falta implementar, distinguir: sistema funcional; materiais cadastrados; fontes ainda ausentes. A nova progressão não está disponível integralmente na jornada normal enquanto os materiais não tiverem fontes.

## HAKI-MIGRACAO-LEGADO

**Status: PENDENTE DE POLÍTICA DO PROPRIETÁRIO**

Decisão recebida em 01/11/2026: migrar também personagens antigos; o proprietário definirá a compensação e o tratamento do Rei.

Saves antigos despertados recebem a estrutura versionada nova, com graduações vazias e `migration.status = pending-owner-policy`. O estado anterior é guardado em `mastery.migration.legacy`; o carregador também preserva a cópia local anterior à migração quando necessário.

Até a política ser definida, a ativação da migração fica controlada: acesso anterior temporariamente preservado no mesmo motor de ativos, investimentos bloqueados, nenhum fragmento concedido e nenhuma árvore completada gratuitamente. Não há um segundo motor nem bônus duplicados. A interface informa a pendência.

Falta definir: compensação; graduações reconhecidas; tratamento do antigo Rei frente ao portão dos dois ramos. Não transformar essa proteção temporária em exceção permanente. Implementar e validar a política antes de encerrar este registro.

## HAKI-BALANCEAMENTO

**Status: PROVISÓRIO PARA TESTES**

Custos: 46 fragmentos para completar Armamento, 46 para Observação e 25 para Conquistador. Cinco intermediários de três graduações + um final por ramo inicial; três intermediários de três graduações + final no avançado.

As parcelas intermediárias só compõem o modificador da habilidade final em execução. Não concedem passivos independentes. No domínio completo, os parâmetros de combate anteriores permanecem: Armamento +15 pp de penetração física e +10% DEF; Observação +15 pp de precisão/esquiva; Conquistador controle de comuns/chefes original.

A configuração em `haki-progression.js` identifica explicitamente `provisional: true`. Quantidades, custos e ritmo aguardam validação com as futuras fontes. Marcos de conclusão versionados preservam o acesso a ramos já concluídos em expansões futuras.
