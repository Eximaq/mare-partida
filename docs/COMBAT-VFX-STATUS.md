# Efeitos de combate e status — 27/10/2026

## Assets e reprodução

15 PNGs e 15 JSONs fornecidos pelo proprietário, copiados integralmente para assets/combat-vfx/. Os 203 quadros usam retângulos e durações do JSON original (83 ms por quadro). Manifesto com hashes e nomes de origem; nenhuma geração ou modificação de arte. Os pivots externos dos exports não são usados como posição de interface: os impactos são ancorados no peito, conforme o pedido.

combat-vfx.js implementa animação, classificação, voo, colisão e layout. combat-vfx-data.js é derivado de assets/combat-vfx/rules.json; tools/import_combat_vfx.py recompõe os metadados a partir da pasta fornecida, preservando bytes dos PNGs/JSONs.

## Impactos e distribuição

| Origem | Efeito aplicado |
|---|---|
| Espadachim / Supa | Corte recebido com espada |
| Gatuno / Lobo / mordida do Ryu / Dachshund | Ataque recebido com adaga |
| Lutador / Neko / Girafa / Bisão / cauda do Ryu / socos Hana / Uma / Beri | Efeito no alvo do soco lutador |
| Gênio Hoya / machados Mato | Corte recebido com espada |
| Atirador | Arquivo combinado Atirador: voo + impacto |
| Ciborgue | Feixe ancorado + novo Efeito ciborgue no alvo (9 quadros) |
| Elemental | Arquivo combinado Mago: voo + impacto |
| Curandeiro | Arquivo combinado Curandeiro: voo + impacto |
| Explosões de talentos e novas habilidades sem impacto próprio | Explosao efect |
| Poder elemental genérico sem impacto próprio | Frames de impacto do Mago |
| Cura efetiva instantânea, poção, comida, roubo de vida | Cura, uma reprodução sobre o corpo |

Doru, Jiki, Beta e Bomu preservam seus impactos exclusivos. Hana usa a pancada compartilhada em cada um dos quatro acertos, sem a sobreposição antiga; o estrangulamento preserva seu overlay exclusivo. Sangramento, veneno e queimadura periódicos não repetem um impacto de arma a cada tick. Kuku, Albatroz, Horu e Kobu usam cura/buff/status quando pertinente; não criam um acerto sem dano.

A exclusividade de impacto é respeitada; nos demais casos, metadados explícitos têm prioridade. Categorias cutting/slashing, blunt, piercing, magical e explosive são aceitas; novos nomes também têm fallback por corte, explosão ou tipo elemental. Cada fruta pode ter uma regra geral e exceções por skill. Nenhum multiplicador de dano, energia, recarga ou passivo foi alterado por esta atualização.

## Voo e sincronização

| Classe | Quadros de voo (numeração humana) | Primeiro quadro de impacto |
|---|---|---|
| Atirador | 1–12, loop | 13 |
| Curandeiro | 1–10, loop | 11 |
| Mago | 1–10, loop | 11 |
| Ciborgue | Feixe ancorado, atlas cyborgBeam, 1–10 em loop | 1 do novo atlas cyborg |

Internamente os índices começam em zero. Atirador, Mago e Curandeiro usam um projétil que acompanha o alvo vivo, gira para o vetor atual e verifica caminho/colisão. O Ciborgue usa um feixe preso ao emissor, apontado continuamente ao alvo inclusive nas diagonais; o contato ocorre após 120 ms de emissão, sem um objeto voando. Na chegada, congela suas coordenadas, inicia a faixa de impacto com elapsed zero e só então executa o desconto de HP e os procs de contato/roubo de vida. O impacto toca os quadros finais a 3× após o dano e mantém o último quadro por um desenho, mesmo que esse golpe mate o alvo. Em área, há um lançamento por vítima elegível, com custo e recarga consumidos uma única vez pela habilidade. Perfuração e ataques secundários com trajetória também usam a colisão.

O ponto de saída do personagem modular foi preservado. Um projétil criado durante o tick permanece na origem nesse primeiro tick. Quando o alvo morre, disparos ainda visíveis encerram os quadros finais sobre sua última posição sem repetir dano. Desaparecimento de alvo vivo, proteção, obstáculo, expiração, troca de personagem/fruta/forma ou área cancelam disparos incompatíveis. Filas limitadas a 64 projéteis e 96 efeitos curtos por sessão, sem serializar callbacks no save.

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
- tests/combat_vfx_artwork_test.py: hashes dos 30 arquivos, transparência, 203 quadros e metadados.
- tests/combat_vfx_backend_test.py: timing, dono/área/alvo, replay, cancelamento, expiração e descritores de status.
- tests/combat_vfx_browser.cjs: sete classes, HP apenas na colisão, primeiro quadro de impacto, habilidade em área sem custo duplicado, status estáticos/CC em loop, cura e alvo morto. Executar no estático e com MARE_EXPECT_API=1 na API atual.
- Regressão de velocidade: 56 casos preservando impacto corpo a corpo e dano de projétil na colisão.
- Regressões das frutas, testes Node/Python gerais e build Pages.

Evidências de navegador, saves e banco de teste ficam em diretório temporário fora do repositório.

## Resultado da entrega

Passaram 87 suítes Node, 113 testes Python de backend/arte e quatro testes de hierarquia. A aceitação de VFX passou em estático, API atual e pacote Pages, além do fallback simulado de API sem as novas rotas. Caçada automática das sete classes validada no estático. Regressões de Ryu, Lobo, Hoya, Doru, Jiki, Beta/Hana e os 56 cenários de velocidade de ataque passaram. Build Pages concluído.

## Ajuste de finalização e Ciborgue — 27/10/2026

Impactos de dano terminam a 3×; cura e status mantêm o tempo original. O último quadro recebe uma passagem de render antes da remoção. Referências de alvos derrotados permanecem somente no VFX temporário, permitindo terminar após a limpeza do monstro, sem novo dano/recompensa. O feixe Ciborgue atualiza a origem ao mover o personagem, calcula o ângulo por atan2 e estende a arte entre emissor e alvo; não desloca um projétil separado. Durante a cauda do impacto, o raio continua ligado ao emissor e desvanece, enquanto os quadros de explosão ficam no contato. A API usa o aquecimento de 120 ms, em vez de tempo de viagem, para esse tipo.

Testes adicionais verificam as oito direções, deslocamento da origem, golpe letal, remoção do alvo, velocidade 3× e apresentação do último quadro. Os PNGs e JSONs fornecidos permanecem intactos.

Validação do ajuste: 87 suítes Node e 114 testes Python passaram. Navegador estático, API atual e Pages passaram; oito direções e movimento do emissor verificados, incluindo golpe letal com limpeza do alvo. Os 56 cenários de cadência de ataque passaram sem alteração de dano ou recarga. Build Pages concluído.

## Novo impacto de pancada — 27/10/2026

O efeito compartilhado punch foi substituído pelo power-aura-take-13 fornecido pelo proprietário: 13 quadros de 212×221 px, 83 ms cada, total original de 1079 ms. PNG e JSON preservados byte a byte. A renderização mantém a proporção nativa e a reprodução acelerada após o dano. A categoria continua atendendo Pugilista, Girafa, Bisão, cauda do Ryu, socos Hana e demais golpes contusivos. O nome lógico punch e os mapeamentos foram mantidos; não há alteração das animações corporais do personagem ou das fórmulas. A imagem usa versão por hash para impedir mistura do atlas novo com o antigo em cache.

## Ciborgue, Neko e socos herdados — 27/10/2026

Efeito ciborgue substitui o impacto elétrico: PNG/JSON originais, 9 quadros de 64×64 e 747 ms, reproduzidos a 3× após o dano. O atlas anterior permanece somente como fonte do raio ancorado (cyborgBeam, primeiros dez quadros). O início do impacto agora é independente da faixa do raio, configurado em impactStarts e compartilhado com a API. Neko usa punch no básico, Bote Feroz e nos quatro acertos da Fúria Felina; o overlay Slash Tiger antigo saiu do combate. Hana também remove o overlay antigo de socos e usa os quatro impactos punch sincronizados ao dano, preservando seu cronograma e o estrangulamento. Girafa, Bisão, cauda Ryu, Uma, Beri e golpes contusivos genéricos continuam no mesmo atlas punch atualizado.

Validação desta troca: 88 suítes Node; 114 testes Python de backend/arte e 4 de hierarquia; navegador estático, API atual e Pages; regressões Neko e Beta/Hana; 56 cenários de cadência; build Pages. Inspeção visual do impacto elétrico na diagonal concluída.
