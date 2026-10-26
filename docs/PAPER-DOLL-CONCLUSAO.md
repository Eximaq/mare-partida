# Personagem único — estado de conclusão

Atualizado em 26/10/2026. Este documento descreve o código e os assets presentes; não representa aprovação artística ou liberação global.

Continuação: [Lutador em quatro direções](PAPER-DOLL-SOCOS-COMBATE.md) e [Atirador em quatro direções](PAPER-DOLL-ATIRADOR.md), disponíveis em pacotes opt-in do laboratório DEV. Cada pacote cobre 32 poses de ataque, além de Idle e Walk compartilhados. Antes da etapa final, o lote acumulava 146 gerações contabilizadas conservadoramente de um teto de 300, sem jobs pendentes desta etapa. Os pacotes continuam sem aprovação artística global.

Continuação de 26/10: [Gatuno modular](PAPER-DOLL-GATUNO.md), 38 gerações cobradas, quatro direções e duas adagas separadas. Sem novas tentativas pagas.

Etapa final de 26/10: Tecnologia, Canalização e bancada unificada implementadas. Reserva conservadora acumulada **222/300**, incluindo cobranças finais não expostas de resultados recuperados da galeria. Nenhuma geração repetida após a pausa.

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

## Cobertura básica concluída no pacote unificado

| Categoria de ataque | Classes atendidas | Corpo/cabelo/roupa | Arma/encaixes |
|---|---|---:|---|
| Espada | Espadachim | 32 poses por camada disponíveis | disponíveis no conjunto azul |
| Punhos | Lutador | 32 poses disponíveis no pacote DEV | mãos livres; equipamento incompatível usa fallback |
| Arma de fogo | Atirador | 32 poses disponíveis no pacote DEV | Mosquete de Convés com encaixes nas quatro direções |
| Adagas | Gatuno | 32 poses disponíveis no pacote DEV | Adagas da Bruma com encaixe independente por mão |
| Tecnologia | Ciborgue | 32 poses reaproveitadas do gesto de disparo validado | Manopla de Aço separada |
| Canalização | Estrategista e Suporte | 32 poses compartilhadas disponíveis | Compasso de Tempestade e Cajado do Farol separados |

As seis categorias de ataque básico estão cobertas no [pacote unificado das sete classes](PAPER-DOLL-SETE-CLASSES.md). São 560 poses de classe/ação/direção verificadas no navegador, com os mesmos movimentos entre facções. A ausência de arma do Lutador é explícita; equipamentos de punhos sem peças continuam com fallback. Cobertura técnica não equivale a aprovação artística ou ativação global.

Os demais equipamentos, novos cabelos, corpos e vestuários não têm arte modular validada. Habilidades, reações e morte ainda recorrem ao legado quando não cobertos. Não declarar que a presença de fallback conclui esses assets.

## Histórico de início da produção

Teto aprovado: **300 gerações, incluindo correções**. Primeira chamada: soco leste, oito poses guiadas por esqueleto, **3 gerações cobradas**. Arquivos preservados em `pixellab-pip-generations/paper-doll-category-attacks-20261023/`. O gesto é legível, mas o frame de índice 1 tem uma marca cinza solta diante das mãos; candidato não aceito em produção e roupa ainda não gerada. Corrigir antes de ampliar o lote. Jobs de outras atividades da conta não entram neste orçamento.

O trabalho passou para `mare-partida-main`, a pedido do proprietário. A base é `origin/main` em `7cf6cc4`; as mudanças locais pré-existentes de Neko e ausências em `.agents` foram preservadas fora do commit. As alterações Paper Doll pendentes foram aplicadas por patch, mantendo os módulos recentes no build. A prévia local desta cópia usa a porta 8126.

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
