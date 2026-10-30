# Personagem único na aventura normal

> Atualização de 30/10/2026: a regra vigente está em [Sprites atuais — fonte única](SPRITES-ATUAIS-FONTE-UNICA.md). O jogador usa exclusivamente native96 (inclusive DEV); `paperDoll96=0` não reativa o modelo antigo. Referências abaixo a rollback/fallback84 ou ensaio temporário no mundo são históricas e foram substituídas. Bancadas antigas continuam isoladas.

Atualização: [Sprint 2 — base padrão de 96 px e visibilidade da cabeça](CAPACETES-E-VISIBILIDADE.md). A descrição de 84 px abaixo é histórica e permanece como fallback.


Implementação de 27/10/2026, autorizada pelo proprietário após a avaliação do conjunto e a correção melee. Branch `feature/paper-doll-player-integration`.

## Uso

A aventura normal carrega o conjunto modular automaticamente. Na criação, cabelo e roupa padrão são escolhas independentes de classe/facção, com prévia animada. O casaco inicial tem prioridade sobre a roupa padrão; ao remover o torso, a escolha base reaparece.

Personagem → Personagem → Personalizar aparência abre o editor normal. É possível conferir quatro direções e Idle/Walk/Attack, aplicar ou descartar. A mesma configuração é usada no mundo, retrato, inventário e ficha. O editor mostra a forma humana mesmo quando uma Zoan está ativa, sem desfazer a transformação em jogo.

## Arquitetura e segurança do progresso

- `player-pack.json` é um manifesto de lançamento separado, com as peças existentes aprovadas para esta integração. URLs, pixels, sockets, animações e offsets são os mesmos do pacote avaliado. `review-pack.json` e todos os estudos históricos continuam inalterados, sem aprovação retroativa.
- O compositor existente é reutilizado com `allowDraft:false` na aventura normal. Rejeita manifestos sem aprovação, peças incompletas e formas Zoan. Falha de carregamento mantém o renderizador antigo, sem composição parcial.
- A primeira carga decodifica no máximo seis imagens simultaneamente. O cache continua limitado; carregamento de peças não é feito por frame.
- `paperDollLook` versão 1 guarda somente IDs válidos de cabelo/roupa. A chave do save não muda. Saves antigos usam padrões por leitura, sem reset ou concessão de recursos. Aplicação grava antes de substituir o estado vivo; erro de armazenamento preserva a aparência anterior.
- O DEV conserva outra chave e continua carregando os manifests de revisão somente por opt-in. Um link de revisão no jogo normal não seleciona arte experimental. Não existe importação de progresso DEV para a aventura normal.
- Equipar/retirar usa as transações originais. Não há kit, criação de armas, retirada automática de equipamentos ou alteração de atributos na aventura normal.

## Equipamentos e cobertura real

A arma e o casaco com peças conhecidas usam seus bindings. Variações sem peça própria usam a representação disponível da categoria; cabeça, botas, pernas, capa e luvas ainda sem camadas conservam o corpo padrão. O editor identifica essas substituições e os bônus permanecem ativos. Isso **não** entrega uma skin inédita para cada item do catálogo.

Ao retirar a arma, sua camada some. O ataque usa o gesto desarmado existente, mantendo as regras e o dano da classe. As sete classes compartilham a identidade; equipamentos e categoria selecionam o gesto/arma.

Habilidades reutilizam os gestos existentes por categoria. Hurt, guard e morte sem sequência modular própria mantêm uma postura da mesma identidade; não se declara uma nova animação autoral de reação/queda. As formas animais e os VFX mantêm o caminho de renderização original e têm prioridade sobre o compositor humano.

## Verificação

- `tests/paper-doll-player.test.cjs`: 28 perfis, peças de produção iguais às revisadas, itens sem arte, aplicação imutável, persistência/validação, rejeição de pacote incompleto/não aprovado, isolamento DEV e limite de conexões.
- `tests/paper_doll_player_browser.py`: criação desktop/celular, aplicação/cancelamento, erro de storage, retrato, inventário real, equipar/retirar, save antigo sem aparência, composição nas 28 identidades e combate das sete classes; entrada DEV preserva o save normal.
- Regressões: compositor/locomoção, conjunto completo DEV, carregamento/fallback, editor antigo isolado, 56 cenários de velocidade, oito Zoans e Ryu, build estático e testes Node.
- Os testes históricos de fallback bloqueiam explicitamente o manifesto de produção quando precisam inspecionar um estudo antigo. A aparência serializada passa a aceitar apenas o campo cosmético documentado; flags de revisão continuam proibidas nos saves.

Capturas locais em `docs/evidence-paper-doll/player/` (ignoradas pelo Git); a suíte CI publica as evidências no artifact Paper Doll. Nenhuma imagem gerada/editada, nenhum crédito PixelLab consumido. Publicação no Pages depende de merge e deploy confirmados.

Resultados locais desta entrega: 88 arquivos de teste Node, build Pages e cenário normal completo passaram. O cenário normal verifica 28 identidades em quatro direções e sete estados, além de dano real nas sete classes. Passaram também editor/DEV isolado, fallback com manifesto de produção indisponível, revisão histórica de locomoção e ataque, 56 cenários de velocidade, oito Zoans, Ryu, VFX e Haki quick-cast. As capturas desktop/mobile foram inspecionadas. A execução única da suíte DEV completa sofreu falhas intermitentes de rede no servidor local; as classes foram conferidas em execuções isoladas e o CI continua sendo a verificação do conjunto integral.
