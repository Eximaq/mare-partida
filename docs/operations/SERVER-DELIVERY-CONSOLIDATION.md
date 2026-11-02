# Consolidação das entregas do servidor — 02/11/2026

O PR [#204](https://github.com/Eximaq/mare-partida/pull/204) foi integrado por merge
normal em `6be7ff5`, após os 24 checks aprovados do head `31c4cb4`. O
[workflow Pages](https://github.com/Eximaq/mare-partida/actions/runs/41381852162)
publicou esse merge com sucesso. A demonstração está em
[eximaq.github.io/mare-partida](https://eximaq.github.io/mare-partida/).

## PRs substituídos e preservação

Os PRs abaixo foram encerrados sem merge adicional e sem apagar suas branches.
Não eram ancestrais da `main`: suas alterações haviam sido transportadas para
entregas posteriores. A auditoria comparou os arquivos de cada PR com `6be7ff5`;
todos os caminhos continuam presentes. Diferenças de implementação/documentação
refletem a evolução descrita abaixo, não autorização para restaurar versões antigas.

| PR | Destino verificado |
|---|---|
| [#198](https://github.com/Eximaq/mare-partida/pull/198) | Instalação local, supervisor, backup e gateway preservados. `main.ts` recebeu o worker de combate no #204; instruções passaram a apontar para entrada direta no jogo. |
| [#199](https://github.com/Eximaq/mare-partida/pull/199) | Infraestrutura e arquivos preservados. O miniporto separado foi substituído pela entrada no jogo original, conforme decisão do proprietário registrada em `ONLINE-VISUAL-LOBBY.md`. |
| [#200](https://github.com/Eximaq/mare-partida/pull/200) | Entrada direta e proteção do save offline preservadas; adaptadores evoluíram para inventário, atributos, mundo e combate nos #203/#204. |
| [#201](https://github.com/Eximaq/mare-partida/pull/201) | Continuação entregue no [#203](https://github.com/Eximaq/mare-partida/pull/203), com catálogo/forja, migração0014 e posterior integração das alterações de mapas e HUD dos colaboradores. #204 acrescentou mundo/combate. |
| [#177](https://github.com/Eximaq/mare-partida/pull/177) | Correção transportada em `c8be42f`. PNG e playback são idênticos; catálogo de animações semanticamente idêntico ao head do PR. Os metadados Hurt estão em `phoenix/hurt-layout.json`; o teste das armas passou a consumir o catálogo extraído. `node tests/phoenix-hurt.test.cjs` passou novamente, cobrindo os quatro quadros nas oito orientações. |

Os PRs #92, #96, #132 e #133 são propostas anteriores de interface/arte, fora desta
cadeia do servidor; foram preservados para avaliação própria. O #39 continua
pausado. Esta consolidação não aprova arte experimental nem descarta trabalhos locais.

## Validação e limite da entrega

O CI do #204 inclui fundação, integração PostgreSQL/HTTP, regressões do jogo,
navegador e Docker real no Linux. Foram mantidas as alterações compartilhadas da
HUD do #205. A pasta original, os saves, as contas e o PostgreSQL não foram alterados
pela consolidação de PRs.

Pages hospeda somente a demonstração estática. O backend continua em loopback na
instalação local. O estado integral do servidor permanece em
[FULL-SERVER-PARITY.md](../architecture/FULL-SERVER-PARITY.md) e
[FULL-SERVER-SCOPE.json](../architecture/FULL-SERVER-SCOPE.json): integrar e publicar
o incremento não significa concluir talentos, frutas, Haki, contratos, masmorras
ou multiplayer compartilhado ainda pendentes.

As próximas atualizações partem da `main` atualizada e encerram seu ciclo com
testes, merge e Pages conforme `AGENTS.md`, respeitando qualquer restrição posterior.
