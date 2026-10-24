# Horu-Horu e Mato Mato — Rank C

Duas Paramecias adicionadas ao final do catálogo (índices 80 e 81), preservando os itens e saves existentes. Ícones e sequências são os 14 arquivos fornecidos pelo proprietário, copiados sem alterações; hashes em assets/akuma/rank-c-manifest.json.

## Passivos de equipamento

| Fruta | Atributos |
|---|---|
| Horu-Horu | +160 HP, +12 ataque físico, +14 ataque especial, +8% cura recebida |
| Mato Mato | +16 ataque físico, +6% velocidade de ataque, +6% penetração, +5% movimento |

Horu favorece suporte híbrido e sobrevivência; Mato favorece dano físico e perseguição. Bônus de velocidade multiplicam a base. Recalcular ou reequipar não acumula atributos. Os valores representam balanceamento inicial; não há simulação de PvP disponível. Tooltips exibem os mesmos modificadores usados pelo JavaScript e Python.

## Horu-Horu

- Hormônio Masculino: 45 energia, 45s de recarga, duração 30s. +30% ataques físico/especial e defesas física/especial. Sprite 1,5× (crescimento reduzido à metade) ancorado nos pés; colisão permanece igual. Aura de solo 110×82, centro 24px acima dos pés e chamas na região dos joelhos, na frente do personagem.
- Hormônio de Cura: 35 energia, 22s de recarga. Pode ser usada sob controle. Remove controles e debuffs, cura exatamente 20% do HP máximo, concede +25% movimento por 6s. A cura percentual desta habilidade não é ampliada pelo passivo de cura recebida. VFX centralizado no corpo: camada traseira completa e arco frontal limitado abaixo da cabeça, deixando-a na frente para o personagem parecer dentro do efeito; reprodução 3,5× a sequência original.
- O jogo publicado continua solo. A integração de party usa membros reais fornecidos por MareRankC.setPartyProvider no cliente e RankCService.party_provider no servidor. Filtra PT, instância, vida e área visível; não cria aliados nem implementa sincronização multiplayer. Dados de party enviados pelo cliente não definem membros no servidor.

## Mato Mato

- Arremesso de Machado: 110% físico; normal custa 20 energia, recarga 8s, percurso reto de até 6 tiles, colisão com sólidos/inimigo. Rotação contínua.
- Arremesso Preciso: 25 energia, recarga 20s, exige alvo visível. Marca 10s, com VFX preso ao alvo e precisão garantida contra ele.
- Cada marca concede quatro arremessos gratuitos, inclusive o primeiro, sem recarga entre eles e utilizáveis mesmo com recarga normal prévia. A quarta carga inicia a recarga de 8s. Depois, arremessos pagos podem ocorrer enquanto a marca ainda existir.
- Projéteis marcados perseguem a posição atual do alvo por todo o mapa, atravessando obstáculos. O alvo é retido fora da câmera. A trava do projétil lançado persiste após expirar a marca; morte, troca de mapa/fruta e reinício removem estados temporários. Um projétil causa dano uma única vez.

## Arquitetura e validação

Regras em assets/akuma/rank-c-rules.json; importação reproduzível em tools/import_rank_c_assets.py; metadados embutidos em rank-c-data.js; lógica visual/party/projéteis em rank-c-system.js; validação transitória em server/rank_c.py. Rota POST /api/akuma/rank-c-impact valida proprietário, instância, trajetória, contato e consumo único. O mundo atual continua simulado pelo cliente, conforme as frutas existentes; essa rota não constitui simulação autoritativa multiplayer.

Testes: rank-c-system.test.cjs, rank-c-art.test.cjs, rank_c_backend_test.py e rank_c_browser.cjs. Navegador real em preview estático (1440 e 900px) e servidor Python: passivos exatos, mutação, cura sob controle, filtros de party, velocidade, quatro cargas gratuitas, cinco impactos aceitos e persistência das recargas. Fixtures e capturas ficam fora do repositório. Executar também os testes existentes de Akuma, passivos, combate e a construção tools/build_pages.py.
