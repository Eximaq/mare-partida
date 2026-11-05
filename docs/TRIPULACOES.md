# Tripulações do Kaizoku Idle

A entrada fica em **Social → Tripulação**. Sem Tripulação só é exibido depois de uma resposta autenticada confirmando que não há vínculo. A demonstração local não cria tripulações nem mantém dados de grupo no navegador.

## Estado e regras

- As migrações `0042_crews.sql` e `0043_crew_professions.sql` são aditivas. O servidor aplica permissões, unicidade, bloqueios de entrada, cotas e progresso em transações. Comandos usam o controle e os recibos existentes para impedir reentrega. O navegador recebe somente as projeções necessárias.
- Nome, sigla e bandeira de 32 × 32 são definidos na fundação. O personagem conserva o nome original. Bandeira e sigla aparecem na ficha, no porto, nas listas do grupo e nos rankings; registros históricos não são reescritos.
- Saída voluntária bloqueia criação/entrada por 12 horas. Quem dissolve fica bloqueado por 24 horas; os demais membros não herdam essa penalidade. O servidor revalida limite, vaga, nível e permissão na aceitação de cada pedido.
- O casco tem capacidades 12, 16, 20, 25 e 30. A instalação começa no nível 1 e vai até 5. A tesouraria só registra Berry debitado do jogador. As obras usam a tesouraria; não consomem Berry do personagem diretamente.
- Cada missão coletiva guarda a capacidade do casco usada ao começar o ciclo. Entrada, saída e obra no mesmo ciclo não alteram a meta. Abates e vitórias usam recibos de combate; uma vitória em grupo conta uma vez por tripulação representada.
- Uma profissão permanente por personagem. As cinco usam o mesmo conjunto de regras: contribuição, caça compatível, material pessoal com 10% de chance por abate elegível e Impel Down (ou patrulha substituta quando indisponível). O servidor fecha o ciclo na segunda-feira às 00h UTC. Os materiais são contadores vinculados ao objetivo semanal, sem preço, transferência ou item na mochila.
- O bônus de cada profissão usa o especialista de maior nível e é limitado pela instalação; não soma duplicatas. Médico afeta poções, Oficial de Comando afeta XP de combate, Cozinheiro afeta Vitalidade, Carpinteiro afeta o custo de obras, e Navegador afeta Berry de monstros.
- Ranking global: soma do poder registrado dos membros ativos da tripulação, com desempate por XP, data de criação e ID. O ranking de jogadores por facção continua disponível.

## Balanceamento inicial

| Objetivo | XP hoje | Perfil futuro, com Boss Semanal |
|---|---:|---:|
| Contribuição | 150 | 120 |
| Caça | 250 | 200 |
| Coleta | 400 | 320 |
| Impel Down ou patrulha substituta | 200 | 160 |
| Boss Semanal, na terceira conclusão distinta | — | 200 |
| Total máximo semanal | 1.000 | 1.000 |

Os níveis profissionais 1–10 exigem, em XP acumulada: **0, 400, 1.000, 1.800, 2.800, 4.000, 5.400, 7.000, 8.800 e 10.800**. Dez ciclos completos entregam até 10.000 XP; o nível 10 exige pelo menos onze ciclos. A meta cheia de contribuição é 4.900 Berry (70% da cota semanal de 7.000), reduzida proporcionalmente na entrada tardia. Custos e parâmetros provisórios ficam em `crew-config.ts` e `crew-profession-rules.ts`. Consulte [a calibração das profissões](architecture/CREW-PROFESSION-CALIBRATION.md) para metas, taxas do simulador e projeções de 56 horas.

## Arte

A interface reutiliza o metal escuro, a madeira, molduras e ícones de Kaizoku Idle. Os cascos evolutivos, recortes de instalações e materiais usam PixelLab Pro; o desenho do jogador é renderizado separadamente, com canal alfa. Os níveis intermediários usam o recorte disponível da instalação e o acabamento visual do nível. A arte é estática, carregada pela interface, sem geração em jogo.

| Origem | Uso |
|---|---|
| PixelLab, galeria `4a417e45-5072-56f0-965a-bfb9fb99579f` | Casco inicial; substitui o piloto cortado |
| PixelLab, galeria `9b1b2ace-8dec-5fd5-bf61-16b871263208` | Enfermaria, 2 recortes |
| PixelLab, galeria `b7b36d29-253c-5c6e-891c-6d3498d74ae0` | Cascos 2–5, recortados e espelhados para a perspectiva comum |
| PixelLab, galerias `0cf4be1f-f81e-5751-930c-77d9222a65ad` e `3284823c-9327-5c23-a3a9-e3417256c175` | Cozinha, cabine, oficina, navegação, armazém e alojamentos |
| PixelLab, galeria `d65b4f2e-8643-5a60-aa99-2bad824214aa` | Cinco materiais dos contratos profissionais |

## Pendências permanentes

| ID | Estado e próximo passo |
|---|---|
| CREW-PVP | Guerra dos Mares inativa. O perfil reserva o maior XP coletivo; faltam evento real e condição oficial. |
| PROF-WEEKLY-BOSS | Indisponível em produção. Conectar o evento real de três conclusões distintas e ligar o perfil de XP a partir de um novo ciclo. |
| CREW-SHOP-CATALOG | Loja sem itens ou compras. Definir catálogo, custos, descontos e limites. |
| CREW-BALANCE | Ajustar custos, cotas, curvas e efeitos após observar a economia e o ritmo de grupos reais. |
| CREW-PROFESSIONAL-MISSIONS | Calibrar ritmo de coleta e caça por mapa, contribuição em Berry e dificuldade de Impel Down com telemetria real. |
| CREW-IDENTITY-EDIT | Edição de nome, sigla e bandeira depois da fundação permanece desativada. |
| CREW-EXPULSION-POLICY | Nenhuma penalidade adicional de expulsão nesta versão. |
