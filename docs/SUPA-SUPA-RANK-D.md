# Supa Supa no Mi — Rank D

Paramecia equipável por qualquer classe no slot Akuma no Mi. Registro disponível no primeiro espaço do Rank D, usando o mesmo fluxo de demonstração do compêndio. O registro concede o bônus permanente existente de +0,1% de Vida máxima e Força base. Não foram acrescentados passivos próprios, drops ou restrições de classe.

| Tecla | Habilidade | Energia | Recarga | Efeito |
|---|---|---:|---:|---|
| 1 | Espiral Cortante | 20 | 10 s | Dano físico instantâneo de 130% do ataque físico em todos os monstros vivos até 128 px do jogador |
| 2 | Retaliação Metálica | 25 | 20 s | Durante 5 s, reduz dano físico em 40% e reflete 30% do dano original ao atacante |

Custos e recargas escolhidos com base nas habilidades atuais das classes: a Espiral troca dano individual por alcance em área, e a Retaliação permite proteção durante 25% do seu ciclo. Redução, coeficiente de dano, reflexão e duração seguem os valores aprovados pelo proprietário. Custos fixos de energia; recargas independentes, preservadas ao trocar de fruta e ao recarregar o save.

## Combate

- O alcance é circular e inclusivo na borda de 128 px, equivalente a dois tiles de 64 px. A caixa envolvente ocupa cinco tiles em cada eixo; os cantos fora do raio não recebem dano.
- O dano da Espiral usa o atributo físico derivado e a fórmula física existente: `max(1, floor(físico × 1,3 − defesa efetiva × 0,30))`. Não acrescenta sorteio de crítico. O VFX fica no centro visual do jogador na ativação e não acompanha movimentos posteriores.
- O escudo segue o personagem e repete todos os doze frames até o prazo real de 5000 ms. Morte, retorno ao porto, troca de mapa e retirada da fruta cancelam a proteção.
- A Spiral Ward é desenhada atrás do sprite do jogador, que permanece visível à frente da habilidade.
- A redução se soma às defesas existentes de forma multiplicativa, antes das reações dos talentos. O combate conserva seus arredondamentos normais.
- A reflexão parte do dano original do golpe, antes de defesa, guarda e redução do escudo. Só atinge o atacante vivo de um golpe físico recebido. Esquiva, aparo, invulnerabilidade, dano mágico e dano direto não geram reflexão. A reflexão usa dano direto ao monstro e não cria ciclos de retaliação.
- Energia insuficiente, recarga ou ativação duplicada pendente impedem a execução sem consumir energia. A tecla e o botão da HUD seguem as mesmas regras.

## Arte e persistência

As sete artes/metadados foram fornecidas pelo proprietário e copiadas sem reencodificação para `assets/akuma/supa/`. O manifesto registra os nomes e hashes. O corte usa o novo `slash-arc`: oito frames de 96×96 px, 59 ms por frame, duração de 472 ms e origem (48,48). O escudo usa `spiral-ward`: doze frames de 102×102 px, 63 ms por frame, ciclo de 756 ms e origem (51,51), repetido durante os 5 segundos de proteção. A dimensão visual anterior é preservada: corte de 256 px e proteção de 120 px. Os PNGs têm versão por hash no endereço para evitar reutilizar a arte antiga no cache. `supa-art.js` contém a transcrição validada dos retângulos, durações e origens dos JSONs, sem depender de uma requisição adicional durante a ativação.

`assets/akuma/supa/rules.json` centraliza o contrato Python; a cópia incorporada no catálogo JavaScript é conferida pelo teste de paridade para o preview estático. Os índices antigos dos itens continuam iguais: frutas Rank E 62–66, espadas 67–70 e armas Gatuno 71–74. Supa ocupa o índice 75.

## Serviço Python

O catálogo e o SQLite registram a fruta Rank D. `/api/akuma/cast` aceita `skill_key`, `energy` e `physical_attack`, calcula os acertos da Espiral e persiste proteção e recargas separadas. As tabelas antigas permanecem compatíveis; a migração acrescenta `skill_cooldowns` e `players.metallic_until`. O escudo pode ser encerrado por `/api/akuma/end-protection`.

`/api/akuma/damage` expõe a mesma regra de mitigação/reflexão usando dano original e dano após defesa, rejeitando valores negativos e não finitos. O cliente local mantém o combate síncrono e usa a mesma regra em JavaScript; não faz uma chamada de rede por golpe. Assim como as frutas anteriores, o serviço opcional recebe atributos e posições do cliente e ainda não controla integralmente HP, energia e combate. Não representa uma implementação de combate multiplayer autoritativo.

## Validação

- `node tests/supa-system.test.cjs`: regras, duas habilidades, alcance, escala física, reflexão e preservação do catálogo.
- `node tests/supa-art.test.cjs`: todos os frames dos JSONs, origens, duração, repetição e encerramento.
- `python tests/supa_backend_test.py`: cadastro, energia, recargas, acertos, proteção, expiração e migração SQLite.
- `node tests/supa-browser.test.cjs`: registro pela interface, mochila, equipamento, HUD, alcance real, redução/reflexão, movimento do escudo e expiração em 5 s. Usa Playwright instalado (`PLAYWRIGHT_MODULE` opcional), `CHROME_PATH` opcional e `MARE_TEST_URL` para escolher o preview ou serviço. O acesso ao estado privado é injetado apenas na resposta interceptada pelo teste.
- Regressões de Akuma, personagem, forja, Haki, tooltips, Zoan, armas e DEV; build estático com `python tools/build_pages.py`.
