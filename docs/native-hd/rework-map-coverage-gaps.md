# Lacunas de cobertura do rework — auditoria em andamento

**Atualização da calça 22 masculina:** fontes originais recuperadas e candidata independente exercitada no mapa. Vínculo definitivo, revisão visual completa e combinações permanecem pendentes; não solicitar uma prancha inteira nova. [Relatório da candidata e evidências](PANTS22_MALE_CANDIDATE.md).

**Escopo atualizado:** capas (slot cloak; defs 23, 24, 135, 142, 149, 156, 163, 170, 177 e 184) não têm impacto visual, conforme orientação do proprietário. Foram retiradas dos pedidos de arte e dos bloqueios visuais. Os resultados históricos de testes não foram reescritos: ocorrências de cloak omitido nessas rodadas deixam de ser pendências visuais. Esta revisão altera apenas o relatório, sem remover itens ou modificar atributos.

Base: `b0d7cf81e7be357e7e4c2a6d1ff4c5f727a804d6`. Branch: `fix/rework-map-user-flows`.

Este relatório não declara a integração concluída. As linhas abaixo indicam ausência de registro por item nos índices runtime de corpo, roupas, cabeça, armas e porte. Ausência de registro não comprova ausência do PNG nos arquivos históricos; procurar a fonte histórica antes de gerar arte nova. Registros estáticos de cabeça também não certificam compatibilidade com ataques ou caminhada.

O relatório reproduzível completo é gerado por `node tools/audit_rework_map_coverage.cjs <diretorio-de-saida>`; os JSONs distinguem seleção automática de validação no mapa. A matriz atual não é o produto cartesiano de todos os slots.

Os capacetes masculinos 18/19 abaixo continuam sem registro runtime, mas suas fontes candidatas foram recebidas e conferidas (390 poses da cabeça). Não são mais pedidos de arte não localizada.

Consulte também [Artes e contratos pendentes](rework-art-requests.md): a revisão histórica já encontrou fontes da arma 0 e da calça feminina 168 que não devem ser solicitadas como arte nova.

## Itens sem registro na combinação de corpo, ação e direção

| def | Nome canônico | Slot | Corpo | Ação | Direções sem registro |
|---|---|---|---|---|---|
| 0 | Espada de Ferro Salgado | weapon | male | idle | south, north, east, west |
| 0 | Espada de Ferro Salgado | weapon | male | walk | south, north, east, west |
| 0 | Espada de Ferro Salgado | weapon | male | attack | south, north, east, west |
| 0 | Espada de Ferro Salgado | weapon | female | idle | south, north, east, west |
| 0 | Espada de Ferro Salgado | weapon | female | walk | south, north, east, west |
| 0 | Espada de Ferro Salgado | weapon | female | attack | south, north, east, west |
| 18 | Bandana das Correntes | head | male | idle | north, east, west |
| 18 | Bandana das Correntes | head | male | walk | north, east, west |
| 18 | Bandana das Correntes | head | male | attack | north, east, west |
| 19 | Capacete do Corsário | head | male | idle | north, east, west |
| 19 | Capacete do Corsário | head | male | walk | north, east, west |
| 19 | Capacete do Corsário | head | male | attack | north, east, west |
| 21 | Grevas de Navegante | legs | male | idle | south, north, east, west |
| 21 | Grevas de Navegante | legs | male | walk | south, north, east, west |
| 21 | Grevas de Navegante | legs | male | attack | south, north, east, west |
| 22 | Calças da Maré Alta | legs | male | idle | south, north, east, west |
| 22 | Calças da Maré Alta | legs | male | walk | south, north, east, west |
| 22 | Calças da Maré Alta | legs | male | attack | south, north, east, west |
| 168 | Saia/Pernas do Rito Marinho | legs | female | idle | south, north, east, west |
| 168 | Saia/Pernas do Rito Marinho | legs | female | walk | south, north, east, west |
| 168 | Saia/Pernas do Rito Marinho | legs | female | attack | south, north, east, west |

## Personalização feminina comprovada no navegador

Save descartável criado pela interface, equipamento inicial removido pelo inventário; campos alterados individualmente na personalização e partida recarregada após cada alteração. A instrumentação apenas observou o desenho no canvas do mapa.

| Campo | Valor testado | Estado salvo | Fonte desenhada | Pendência |
|---|---|---|---|---|
| Cabelo | hair-bob | Preservado após reload | Variante hair-bob no mapa | Correção de vínculo confirmada neste cenário |
| Cor do cabelo | pink | Preservado após reload | hair-bob/pink no mapa | Aplicação e recarga confirmadas na candidata native96-8d6ab865bc7ffa0d; cabelo original fundido é outro contrato |
| Olhos | face-focused | Preservado após reload | Face original | Fonte de face correspondente compatível com a cabeça feminina |
| Cor dos olhos | green | Preservado após reload | eye-palette:green no mapa | Aplicação e recarga confirmadas na candidata; estilos de face diferentes de original continuam pendentes |
| Pele | dark | Preservado após reload | Paleta original | Máscaras de pele da cabeça e corpo compatíveis com os clipes |

Essas pendências não autorizam recolorir regiões por aproximação nem trocar a base feminina pela masculina. A disponibilidade histórica das máscaras/fontes ainda precisa ser cruzada.

## Validação ainda necessária

- Todas as armas e combinações pelo inventário real; auditoria automática não substitui esta etapa.
- Primeira carga lateral, alternância com cache e vídeo de movimento/parada em ambos os corpos.
- V5 com os cinco estados capturados por ataque real e controle incompatível.
- Prova de pixels feminina completa, suite integral, build em checkout limpo e CI remoto.
- Revisão histórica para classificar cada linha como arte ausente, vínculo ausente, incompatibilidade ou calibragem.

Nenhum novo PR foi entregue como pronto. Nenhum PNG foi alterado.

A auditoria inclui historicalGear de female-original-face-ownership.json. Os seis registros femininos 18/19 NORTH/EAST/WEST existem nesse índice auxiliar e foram retirados da lista de fontes ausentes.
