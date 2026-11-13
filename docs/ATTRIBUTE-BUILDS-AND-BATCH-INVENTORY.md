# Atributos, builds e inventário em lote

As regras novas estão em attribute-rules.js e inventory-batch.js, carregadas pelo navegador e pelo servidor. Os IDs, pontos por nível (5), pontos investidos, catálogo de pérolas e estoques antigos são preservados.

## Fórmulas finais

| Atributo | Contribuição |
|---|---|
| Força | Ajustada = 500 × ln(1 + F/500); dano físico 0,24% (Lutador/Espadachim 0,28%) e Defesa bruta 0,24 por ponto ajustado |
| Destreza | Teto × D/(D+H); velocidade 100%/150% Gatuno/110% Espadachim, H=500; esquiva 25/35 pp H=600; crítico 45/55 pp H=400; recarga de dano 20%, H=500 |
| Vitalidade | HP 0,30%/0,45% Ciborgue; Defesa 0,20%; regeneração 0,002%/0,02% Ciborgue do HP final por segundo, limitada a 2% |
| Inteligência | Elemental 0,34%/0,40% Mago e Curandeiro; Energia 0,25%/0,35% |
| Espírito | Elemental 0,20%; Energia 0,50%; regeneração de Energia +0,25% da taxa-base; cura +0,40%; Proteção +0,25 pp, limitada conforme abaixo |

Inteligência e Espírito somam suas contribuições antes da multiplicação. Defesa bruta de Força entra antes do percentual de Vitalidade. Os atributos consideram nascimento, investimentos, equipamentos, pérolas e bônus elegíveis da Tripulação. Talentos, Haki e frutas mantêm sua ordem. A regeneração de Vitalidade é calculada sobre o HP final, separada de multiplicadores de cura recebida. O Poder considera as grandezas finais, incluindo cadência, regeneração, penetração e precisão.

### Proteção comprovada no código

character-system.js/incoming usa protection na mitigação recebida enquanto a guarda está ativa; talent-system.js também a modifica por eficiência de proteção. Não é defesa do alvo. Mantida essa semântica: base 30% (38% Ciborgue) + 0,25 ponto percentual por Espírito, teto final existente 80%. Com 100 de Espírito: 55%/63%; com 400: 80%, sem imunidade nem valor negativo. Não foi criada penetração por Espírito.

### Recomendações

| Perfil | FOR | DES | VIT | INT | ESP |
|---|---:|---:|---:|---:|---:|
| Lutador |45|20|30|0|5|
| Espadachim |45|30|20|0|5|
| Gatuno |30|45|20|0|5|
| Atirador |40|35|20|0|5|
| Ciborgue |30|15|40|0|15|
| Mago (strategist) |0|15|20|45|20|
| Curandeiro (healer) |0|10|25|15|50|

Todas as classes existem. Os ataques físicos de Atirador e Ciborgue usam physical no controlador real e recebem a nova contribuição de Força; os percentuais pedidos foram mantidos. O texto do atributo principal de Atirador foi alinhado a Força. Os coeficientes antigos de dano plano por Destreza foram substituídos pelas fórmulas solicitadas. As recomendações são iniciais de PvE, não garantias de melhor build.

Desempate de créditos: Força, Destreza, Vitalidade, Inteligência, Espírito. A prévia usa uma cópia; confirmar persiste investimento e créditos juntos. Trocar perfil reinicia os créditos sem redistribuir investimentos. Automático exige escolha explícita e usa só os 5 pontos de cada novo nível; pontos livres anteriores permanecem livres.

## Inventário

Selecionar marca IDs de instâncias, preservados na ordenação e paginação. Pilhas são vendidas por inteiro, com quantidade, preço unitário e total na confirmação. A prévia é invalidada por mudanças relevantes; o servidor valida tudo novamente. Reserva de troca continua protegida pelo gatilho transacional existente. Vínculo não impede venda a NPC; tipos que já não eram vendáveis continuam protegidos. O recibo de comando existente garante repetição sem novo pagamento. Bloquear/desbloquear usa o mesmo fluxo de comandos.

O item mana-potion e manaPotions permanecem intactos; apresentação: **Porção de Energia**, líquido roxo, cooldown 5 segundos. As pérolas exibem os nomes e percentuais do catálogo; não há conversão de gemas de Ataque/Crítico em atributos.

## Implantação

Aplicar migração 0060_attribute_builds.sql e atualizar os grants do runtime. Ela cria a preferência/créditos e amplia o HP do encontro legado para precisão fracionária, preservando registros e recibos antigos. O combate de mundo já usava JSON numérico. Build estático: python tools/build_pages.py. Servidor: npm run build. Não há distribuição de itens nem alteração de personagens de produção nesta implementação.

## Como testar

Abra Inventário, clique Selecionar, marque dois equipamentos desbloqueados e use Vender selecionados. Confira os valores antes de confirmar. Em Personagem → Atributos, escolha uma recomendação, prepare a distribuição e confira a prévia antes de confirmar. Ative distribuição automática apenas se desejar. Recarregue para conferir persistência. Os testes automatizados usam personagens e banco temporários isolados.


## Verificações executadas

- 243 testes foundation aprovados; 204/204 arquivos Node legados aprovados (o harness separado supa-browser não faz parte desse comando).
- 23 testes de integração aprovados em PostgreSQL temporário, incluindo concorrência, replay, rollback, vínculo, créditos e progressão automática.
- Navegador autenticado: pérolas no painel e poção roxa; venda de dois equipamentos por 98 + 105 = 203 Berry; prévia de 45 pontos, confirmação, preferência automática e recarga persistida.
- Testes de fórmulas incluem Força 500 = 83,1777%/97,0406% e 83,1777 Defesa; Destreza nos quatro pontos de referência; Inteligência/Espírito 500 = 3,70× elemental; tetos de regeneração e Proteção, além de cadência/recarga no motor real.
- As capturas do ambiente de teste apresentam o retrato do personagem vazio na versão atual da base. A alteração não modifica o renderizador nativo; a validação visual realizada cobre os controles, valores, ícones e pérolas desta atualização.
