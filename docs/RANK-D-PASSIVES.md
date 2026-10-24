# Passivos de equipamento — Rank D

Mantidos os cinco conjuntos solicitados como balanceamento inicial; antes, estas frutas não tinham passivos de equipamento. Aplicam somente no slot equipado, sem acúmulo por recálculo, registro ou transformação. Retirar a fruta remove os bônus.

| Fruta | Passivos |
|---|---|
| Lobo | +12 ataque físico, +8% velocidade de ataque, +5% roubo de vida, +5% movimento |
| Doru | +14 ataque especial, +10 defesa física, +100 HP, −5% recarga |
| Girafa | +180 HP, +15 defesa física, +10 ataque físico, +5% penetração |
| Leopardo | +10 pontos percentuais de crítico, +0,15 no multiplicador crítico, +10 ataque físico, +8% movimento |
| Supa | +18 defesa física, +10 ataque físico, reflexão de 5% do dano físico recebido, +80 HP |

## Interações

Ataque/defesa/HP somam valores fixos após o cálculo existente; velocidades multiplicam. Preservados limites de 65% de crítico, 60% de penetração, 30% de roubo de vida passivo combinado com talentos e ciclo mínimo de ataque de 150 ms. A parcela de cura da fruta é centralizada e descontada do hook de talentos, evitando dupla aplicação.

- Lobo: 5% passivo mais 10% da aura totalizam 15% de cura. Velocidade: 1,08 × 1,30 = 1,404 com aura. Expirar a aura mantém os passivos.
- Girafa: cabeçada soma 30% da habilidade e 5% da fruta, respeitando o limite de penetração.
- Supa: espinhos usam 5% do dano físico após mitigação, somando à reflexão ativa de 30% do original. Esquiva, dano mágico/direto e dano marcado como refletido não disparam espinhos. Mantido arredondamento/mínimo de dano existente.
- Doru: novas recargas da fruta e habilidades de classe multiplicam por 0,95, combinando com facção multiplicativamente. Não reseta recargas antigas nem altera Haki/recargas internas. O bônus especial melhora a cera em qualquer classe: +14 no poder de referência dos projéteis, sem aumentar o básico físico. Classes mágicas já recebem esse bônus no ataque elemental, sem segunda aplicação. Preservados tipo, defesa e coeficientes da cera.

## Implementação

Dados em assets/akuma/rank-d-passives.json; espelho estático em akuma-passives.js validado por teste para Pages/file://. server/fruit_stats.py lê o JSON e expõe DEVIL_FRUIT_STATS. Mantidos IDs canônicos e índices existentes.

O catálogo Python expõe passive_stats/passiveStats; o estado expõe passive_stats; /api/akuma/stats aceita base_stats opcionais para calcular os modificadores. Casts recebem o poder final do cliente sem somar bônus novamente. A arquitetura de combate local do protótipo permanece. Sem migração de save. Tooltips e inventário exibem todos os atributos e percentuais em português.

## Validação

Testes Node/Python: dados, valores, recálculo, caps, penetração, reflexão e aura. tests/rank_d_passives_browser.cjs: cinco tooltips reais, status, remoção, cura sem duplicação, espinhos, recargas, cera, reload e paridade da API. Executado em 1440px, preview 900px e serviço Python. Regressões das cinco frutas e sincronização de ataques passaram.
