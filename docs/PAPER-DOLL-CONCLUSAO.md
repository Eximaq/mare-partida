# Personagem único — estado de conclusão

Atualizado em 23/10/2026. Este documento descreve o código e os assets presentes; não representa aprovação artística ou liberação global.

## Integração executada

- Identidade visual independente de classe/facção, com uma base humana compartilhada.
- Corpo, cabelo, roupa e espada sincronizados por pose nas quatro direções de Idle, Walk e Attack/sword.
- Locomoção sem arma nas 28 combinações; equipamento incompatível conserva fallback integral.
- Personagem → Personalizar aparência abre uma prévia com direção e movimento. No jogo normal, oferece acesso explícito ao laboratório; não habilita arte incompleta na aventura.
- Duas opções de cabelo (curto preto/sem cabelo) e roupa padrão (azul/corpo-base), usando somente pixels existentes. Armadura equipada tem precedência sobre a roupa padrão.
- Rascunho, descarte e aplicação transacional. O campo opcional `paperDollLook` versão 1 é gravado somente no save DEV; falha de armazenamento preserva a configuração anterior. Dados antigos ou inválidos usam os padrões sem reescrever saves.
- Mundo, retrato, inventário e prévia usam o mesmo resolvedor. Classe/facção e dados de combate não são alterados pela aparência.
- Pacotes aceitam peças adicionais e `categoryWeapons`, preservando validação de IDs, direção, frames e categoria. Arma de uma categoria nunca substitui implicitamente a de outra.
- Auditoria `paper-doll-coverage.js` distingue cobertura declarada, aprovação artística e habilitação de produção. A validação real das imagens continua no compositor/carregador.

## Assets que ainda impedem a conclusão

| Categoria de ataque | Classes atendidas | Corpo/cabelo/roupa | Arma/encaixes |
|---|---|---:|---|
| Espada | Espadachim | 32 poses por camada disponíveis | disponíveis no conjunto azul |
| Punhos | Lutador | 32 poses por camada ausentes | pendentes |
| Arma de fogo | Atirador | 32 poses por camada ausentes | pendentes |
| Adagas | Gatuno | 32 poses por camada ausentes | pendentes |
| Tecnologia | Ciborgue | 32 poses por camada ausentes | pendentes |
| Canalização | Estrategista e Suporte | 32 poses por camada ausentes | pendentes |

Total ausente de anatomia/vestuário: **480 frames** (5 categorias × 4 direções × 8 poses × 3 camadas). Não são 480 gerações: cada chamada pode entregar vários frames. Armas exigem cobertura de 160 poses de ataque e 240 poses de locomoção nas cinco categorias restantes; peças rígidas podem compartilhar pixels, mas precisam de encaixes reais por pose.

Os demais equipamentos, novos cabelos, corpos e vestuários não têm arte modular validada. Habilidades, reações e morte ainda recorrem ao legado quando não cobertos. Não declarar que a presença de fallback conclui esses assets.

## Produção proposta, ainda não iniciada nesta continuação

Reserva sugerida: até 300 gerações, incluindo correções. A autorização de teto está pendente. O saldo consultado foi 2.223,7 e não havia jobs ativos. Nenhuma geração foi consumida nesta continuação.

Produzir uma categoria/direção primeiro, inspecionar o corpo sem roupa, testar encaixe de cabelo/roupa/arma e continuidade, e somente então ampliar o método. Reutilizar os movimentos por categoria entre facções; não criar 28 conjuntos de animação. Não repetir o método de transferência que já redesenhou membros ou confundiu espada com braço sem corrigir a causa. O teto não garante aprovação artística dos resultados.

## Critérios ainda necessários para liberação global

1. Assets reais e coerentes para as seis categorias e suas armas; nenhum empréstimo de gesto incompatível.
2. Preservação do instante de impacto e dos cooldowns existentes em todas as classes; o compositor não cria dano.
3. Inspeção visual de transições, equipamentos e quatro direções no combate real.
4. Política de fallback/visual para equipamentos ainda sem peças claramente resolvida antes de prometer cobertura integral.
5. Haki, Zoan, morte, troca de classe e retratos validados com o conjunto completo.
6. Aprovação artística e liberação explícita do catálogo, sem ligar flags para contornar assets ausentes.

## Verificações desta continuação

Testes Node cobrem preferências antigas/inválidas, aplicação imutável, precedência do equipamento, proteção de save normal, cobertura por categoria e gates. Chromium cobre a tela por cliques reais, cancelar/aplicar/recarregar, falha de armazenamento, quatro direções/ações, layout de celular e isolamento do save normal. A comparação das 28 identidades e a caminhada das sete classes permanecem em `paper_doll_dev_browser.py`. `paper_doll_world_review_browser.py` verifica o conjunto de espada com dano real, Haki, cache e bypass Zoan.

Capturas locais: `docs/evidence-paper-doll/appearance/`; não versionar evidências em massa ou saves. A execução em paralelo de dois testes de navegador apresentou timeouts de inicialização; as execuções isoladas passaram. O build nunca deve ser refeito enquanto um teste usa `dist`.
