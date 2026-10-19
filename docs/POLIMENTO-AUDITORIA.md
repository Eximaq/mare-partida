# Auditoria da sprint de polimento — 18/10/2026

Fonte: arquivos correntes, AGENT.md, README, relatórios de UI/atributos e sprites/facções, testes atuais. Não se utilizou backup como base de desenvolvimento. Capturas reais antes das alterações em `evidence-polish/before/`: 39 capturas nos três tamanhos, com fixture idêntica de equipamentos. Contextos isolados; nenhum save do usuário acessado.

Checkpoint: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-polish-20261018-183306`. Inclui fontes atuais, assets, ícones, documentação, ferramentas e testes.

## Diagnóstico

| Problema | Camada responsável | Correção proposta |
|---|---|---|
| Menu sem expansão, sete botões muito pequenos para leitura prolongada | Componente | Compacto por padrão e expansão opcional por botão de teclado/mouse; preferência persistida |
| Tamanhos e margens se sobrepõem em várias regras de menu | CSS | Uma família de regras do menu no design system; remover os overrides duplicados desse arquivo |
| Nome longo esconde nível, HUD muito compartimentada | Layout/componente | Nome e nível separados; resumir moeda/poder, reduzir moldura e altura |
| Slots 5/6 em laterais com pesos diferentes | Layout | Mesmas seis linhas, um espaço neutro à esquerda; onze slots reais intactos |
| Fundo de slots vazios pouco claro; sobra vertical na mochila | CSS/layout | Grade 7×5 ocupando área disponível, contraste consistente e paginação com contagem |
| Seleção de item não compara troca nem destaca slot atualizado | Componente | Comparação por derivados reais e feedback temporário da troca |
| Cadeado usa glifo pequeno, forja comunica resultado apenas por toast | Componente | Indicador legível de trava e resultado junto ao item na forja |
| XP não aparece junto à recompensa compacta de ouro | Componente | Notificação agregada, curta, limitada em quantidade e fora do centro |
| Base50 mudou derivados, sem benchmark controlado recente | Diagnóstico | Simular sete classes × níveis1/5/10/20/30, mesmos inimigos/equipamentos/perfis; não alterar fórmulas |

As seções removidas anteriormente do menu Personagem permanecem removidas. Mercado/cofre indisponíveis permanecem explícitos. Nenhum sprite, ícone aprovado, mapa, câmera, região, classe ou limite da mochila será substituído. Paleta, tipografia e materiais existentes de `ui-nautical.css` continuam como referência. As demais janelas receberão apenas ajustes identificados pela verificação visual, sem reconstrução.
