# Efeitos de combate e status — 27/10/2026

## Assets e reprodução

14 PNGs e 14 JSONs fornecidos pelo proprietário, copiados integralmente para assets/combat-vfx/. Os 190 quadros usam retângulos e durações do JSON original (83 ms por quadro). Manifesto com hashes e nomes de origem; nenhuma geração ou modificação de arte. Os pivots externos dos exports não são usados como posição de interface: os impactos são ancorados no peito, conforme o pedido.

combat-vfx.js implementa animação, classificação, voo, colisão e layout. combat-vfx-data.js é derivado de assets/combat-vfx/rules.json; tools/import_combat_vfx.py recompõe os metadados a partir da pasta fornecida, preservando bytes dos PNGs/JSONs.

## Impactos e distribuição

| Origem | Efeito aplicado |
|---|---|
| Espadachim / Supa | Corte recebido com espada |
| Gatuno / Neko / Lobo / mordida do Ryu / Dachshund | Ataque recebido com adaga |
| Lutador / Girafa / Bisão / cauda do Ryu / socos Hana / Uma / Beri | Efeito no alvo do soco lutador |
| Gênio Hoya / machados Mato | Corte recebido com espada |
| Atirador | Arquivo combinado Atirador: voo + impacto |
| Ciborgue | Arquivo combinado Ciborgue: voo + impacto |
| Elemental | Arquivo combinado Mago: voo + impacto |
| Curandeiro | Arquivo combinado Curandeiro: voo + impacto |
| Explosões de talentos e novas habilidades sem impacto próprio | Explosao efect |
| Poder elemental genérico sem impacto próprio | Frames de impacto do Mago |
| Cura efetiva instantânea, poção, comida, roubo de vida | Cura, uma reprodução sobre o corpo |

Doru, Jiki, Beta e Bomu preservam seus impactos exclusivos. Hana mantém os braços de lançamento e os golpes recebem a pancada; o estrangulamento preserva seu overlay exclusivo. Sangramento, veneno e queimadura periódicos não repetem um impacto de arma a cada tick. Kuku, Albatroz, Horu e Kobu usam cura/buff/status quando pertinente; não criam um acerto sem dano.

A exclusividade de impacto é respeitada; nos demais casos, metadados explícitos têm prioridade. Categorias cutting/slashing, blunt, piercing, magical e explosive são aceitas; novos nomes também têm fallback por corte, explosão ou tipo elemental. Cada fruta pode ter uma regra geral e exceções por skill. Nenhum multiplicador de dano, energia, recarga ou passivo foi alterado por esta atualização.

## Voo e sincronização

| Classe | Quadros de voo (numeração humana) | Primeiro quadro de impacto |
|---|---|---|
| Atirador | 1–12, loop | 13 |
| Curandeiro | 1–10, loop | 11 |
| Mago | 1–10, loop | 11 |
| Ciborgue | 1–10, loop | 11 |

Internamente os índices começam em zero. O projétil acompanha o alvo vivo, gira para o vetor atual e verifica caminho/colisão. Na chegada, congela suas coordenadas, inicia a faixa de impacto com elapsed zero e só então executa o desconto de HP e os procs de contato/roubo de vida. O impacto continua mesmo que esse golpe mate o alvo. Em área, há um lançamento por vítima elegível, com custo e recarga consumidos uma única vez pela habilidade. Perfuração e ataques secundários com trajetória também usam a colisão.

O ponto de saída do personagem modular foi preservado. Um projétil criado durante o tick permanece na origem nesse primeiro tick. Morte/desaparecimento/proteção do alvo, obstáculo, expiração, troca de personagem/fruta/forma ou área cancelam disparos incompatíveis. Filas limitadas a 64 projéteis e 96 efeitos curtos por sessão, sem serializar callbacks no save.

## Status aéreos

Layout compartilhado para jogador, monstros e Gênio, baseado na altura atual do sprite, incluindo transformações, crescimento e Cocox:

- Barra e nome ficam acima do espaço dos controles; ícones estáticos de 18 px ficam à direita, considerando a largura real do nome/barra.
- Aumento de armadura, redução de armadura e buff usam o primeiro quadro, sem animação durante a duração.
- Estrelas de atordoamento e anéis de paralisação/enraizamento usam loop de 26 px entre a cabeça e a barra/nome.
- A remoção depende do temporizador/flag real, não da duração de uma cópia do efeito. Expiração, dispel e troca de estado retiram o indicador no mesmo desenho.
- Cura usa uma animação breve sobre o corpo, termina após os quadros originais e não cria um buff permanente. Regeneração silenciosa não gera efeitos a cada frame.

Indicadores observam guard/blessing, Haki, escudos, Ushi, Lobo, Horu, Bisão, Kobu, Gênio, bônus temporários de talentos, quebra de defesa e todos os controles existentes (talentos, Rei, Ryu, Hana, Beta e Doru). Passivos permanentes de equipamento/Compêndio não ocupam a fila de buffs temporários. As auras e animações exclusivas das frutas continuam presentes.

## API e compatibilidade

server/combat_vfx.py compartilha os limites de quadros e valida lançamento/impacto: dono, instância, alvo, coordenadas, alcance, tempo mínimo de voo, expiração e token de uso único. Rotas vfx-launch/vfx-impact sob /api/akuma/. A resposta de estado de Akuma inclui descritores vfx_statuses com tempo restante/expiração observáveis dos buffs disponíveis.

A API local continua recebendo o mundo simulado pelo cliente; não se tornou um servidor PvP autoritativo. O HP das classes já pertence à simulação cliente. A confirmação de colisão da API libera o mesmo callback que inicia a faixa de impacto e aplica o dano, sem aplicá-lo duas vezes. O catálogo de capacidade vfx-catalog permite usar a mecânica local quando a API é ausente ou anterior a esta versão. GitHub Pages funciona sem Python.

## Validação

- tests/combat-vfx.test.cjs: limites de quadros, loop, HP atrasado, tracking, impacto fixo, token assíncrono, cancelamentos, classificação e tempos exatos de status.
- tests/combat_vfx_artwork_test.py: hashes dos 28 arquivos, transparência, 190 quadros e metadados.
- tests/combat_vfx_backend_test.py: timing, dono/área/alvo, replay, cancelamento, expiração e descritores de status.
- tests/combat_vfx_browser.cjs: sete classes, HP apenas na colisão, primeiro quadro de impacto, habilidade em área sem custo duplicado, status estáticos/CC em loop, cura e alvo morto. Executar no estático e com MARE_EXPECT_API=1 na API atual.
- Regressão de velocidade: 56 casos preservando impacto corpo a corpo e dano de projétil na colisão.
- Regressões das frutas, testes Node/Python gerais e build Pages.

Evidências de navegador, saves e banco de teste ficam em diretório temporário fora do repositório.

## Resultado da entrega

Passaram 87 suítes Node, 113 testes Python de backend/arte e quatro testes de hierarquia. A aceitação de VFX passou em estático, API atual e pacote Pages, além do fallback simulado de API sem as novas rotas. Caçada automática das sete classes validada no estático. Regressões de Ryu, Lobo, Hoya, Doru, Jiki, Beta/Hana e os 56 cenários de velocidade de ataque passaram. Build Pages concluído.
