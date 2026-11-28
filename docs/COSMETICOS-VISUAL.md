# Cosméticos na aba Visual

Abra **Inventário → Visual** e use **Resgatar visuais iniciais** na coleção. Selecione cada peça para usar ou retirar seu visual. Os slots de Luva e Arma já estão disponíveis para futuras peças. O Visual Completo conserva a prioridade enquanto estiver em uso. Ao retirá-lo, os cosméticos individuais voltam a aparecer.

## Primeiro conjunto

A referência de figurino é **Romance Dawn**, do East Blue. As quatro artes de roupa foram desenhadas para os corpos e poses do Kaizoku Idle. [Referência oficial do figurino, Bandai Spirits](https://tamashiiweb.com/item/14796/?wovn=en)

| Peça | Slot | Ícone |
| --- | --- | --- |
| Chapéu de Palha do Alísio | Cabeça | `assets/ui/cosmetics/east-blue/hat.png` |
| Colete Rubro da Aurora | Peitoral | `assets/ui/cosmetics/east-blue/vest.png` |
| Bermuda de Lona Índigo | Calça | `assets/ui/cosmetics/east-blue/shorts.png` |
| Sandálias do Convés | Bota | `assets/ui/cosmetics/east-blue/sandals.png` |

Os ícones RGBA de 320 × 320 são reproduzíveis com `python tools/draw_cosmetic_icons.py`, usando Pillow. A arte de personagem é preparada em camadas transparentes por quadro pelo módulo `cosmetic-art.js`. As camadas acompanham a geometria e a temporização do renderizador HD e reutilizam os quadros já preparados no cache. Colete, bermuda e sandálias aproveitam a pele da base do jogador nas regiões expostas. O colete usa o tronco e as juntas do quadro atual para separar frente, costas e perfil. Em receptores laterais compatíveis, o tronco contínuo e os braços em primeiro plano são lidos das partes originais de cada quadro. As costuras e os contornos são desenhados na densidade nativa do atlas HD. Ombros, braços em primeiro plano e arma conservam a sobreposição da pose.

## Persistência e limites

O resgate de teste é único por personagem e está disponível para o corpo masculino. A coleção em `character_profile.cosmetics` é separada da mochila física. O servidor valida posse e slot e envia aos outros jogadores somente a seleção equipada, conforme a preferência de privacidade. A versão offline grava a coleção no save local. O equipamento funcional continua sendo a fonte de atributos, efeitos, classe de arma e colisões.

A coleção inicial é obtida pelo resgate da aba Visual. A negociação das quatro peças novas por Mercado ou Troca Direta ainda depende de integrar as reservas e as entregas desses fluxos à coleção. As instâncias de Visual Completo anteriores mantêm as regras de mochila e de comércio existentes.

O catálogo já reserva o slot visual de arma. Cada futuro cosmético de arma precisará ter arte compatível com o contrato de movimento da arma funcional. O conjunto de teste usa apenas Cabeça, Peitoral, Calça e Bota.

## Verificações focadas

- O censo de integração inicial cobriu uma arma de cada uma das sete classes com quatro direções em repouso, caminhada e ataque. A revisão de encaixe concentrou-se nas quatro direções de repouso, espada e mosquete do masculino. A seleção de um personagem feminino existente mantém a montagem anterior.
- Inspeção visual por amostragem em peças isoladas, conjunto integral, mistura com arma e recortes das sandálias. O ajuste anatômico do colete foi comparado separadamente nos ciclos de ataque, incluindo espadas laterais e armas de fogo. A aba do chapéu recebe um pequeno recuo nos perfis Leste e Oeste. A barra clara da bermuda segue a linha da perna, e as tiras das sandálias acompanham cada sola.
- No Chromium, conferência da coleção e prévia em desktop e celular, resgate e persistência offline, e prioridade e restauração após uso do Visual Completo. Na Ilha Dawn, foram desenhados os quatro visuais isolados, o conjunto com espada, as quatro direções da caminhada e o ataque de espada.
- Em PostgreSQL isolado, atualização de save anterior, resgate com mochila de 120 itens, verificação de posse, preservação de equipamento, saldo e atributos, e réplica de mudanças na ficha pública, no porto e no grupo.
- Testes locais de compositor e sessão com `node --test tests/cosmetic-art.test.cjs tests/foundation/direct-game.test.mts`. A regressão histórica de comparação exata do retrato registrou a mesma diferença de 189 canais RGBA no ambiente local, tanto na base sem cosméticos quanto na branch, antes de usar a coleção. A checagem do marcador de portal também falhou na base com a mesma expectativa. O build local de Pages depende do acervo completo, ausente no checkout parcial.
