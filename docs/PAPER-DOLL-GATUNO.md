# Gatuno modular — adagas em quatro direções

Atualizado em 26/10/2026. Pacote de avaliação no laboratório DEV, sem aprovação artística global ou ativação na aventura normal.

## Acesso e cobertura

- Bancada: `tools/paper-doll-inspector/index.html?pack=rogue`.
- Combate: `?dev=1&paperDollReview=rogue`. Escolher Gatuno no DEV, equipar Adagas da Bruma (definição 12) e remover peças sem representação modular.
- Idle (4 poses), Walk (8) e ataque de adagas (8), em sul/norte/oeste/leste: 80 poses compostas. Mesmos movimentos para as quatro facções.
- Corpo, cabelo, roupa e armas independentes. As duas lâminas seguem encaixes próprios das mãos; a lâmina distante fica encoberta nos perfis. O golpe visual continua causando apenas um impacto, no relógio original.
- Habilidades e equipamentos não cobertos preservam fallback integral. Transformações Zoan não utilizam este pacote. O save normal não é modificado.

## Origem e montagem

Idle/caminhada e cabelo vêm do conjunto humano azul existente. Novos ataques foram gerados em 64×64, oito frames por direção; o eco da referência permanece separado. Padding transparente 10/13 resulta em canvas 84×84 e pivô 42/65. Nenhum redimensionamento, espelhamento corporal ou frame duplicado.

As transferências de roupa são compostos originais preservados; somente regiões de vestuário foram extraídas, sem substituir a anatomia. A edição da adaga norte redesenhou o personagem de frente: esse corpo foi descartado da montagem, conservando apenas os pixels da lâmina isolada. Todos os originais permanecem no diretório do lote. Cabelo e armas utilizam imagens rígidas com encaixes medidos por pose; o movimento corporal é real.

## Validação

87 arquivos de testes Node passaram, incluindo validação de duas armas, oclusão, encaixes inválidos, quatro facções, equipamento e proteção de produção. Build estático passou. Chromium verificou 80 poses, combate real nas quatro direções, um impacto por ataque, fallback de habilidades, remover/reequipar, celular e isolamento do save normal. Regressões do Atirador e Lutador passaram; 56 cenários de velocidade de ataque passaram.

Inspeção visual dos contatos de Idle, Walk e Attack feita sobre imagens capturadas no navegador, além do combate e bancada. Capturas locais em `docs/evidence-paper-doll/rogue/`, fora do Git. Essa inspeção técnica não substitui a aprovação artística do proprietário.

## Custo e limites

38 gerações cobradas: 4 animações de corpo (4), 3 transferências de roupa (30) e 4 adagas (4). Sem retries. Acumulado conservador do orçamento atual: 146/300; restam 154. Nenhum job deste lote pendente. Receita portátil em `rogue.blueprint.json`; não executar novamente sem necessidade e orçamento válido.

Ainda faltam Tecnologia (Ciborgue) e Canalização (Estrategista/Suporte), além de aprovação final e cobertura de equipamentos adicionais. Este pacote não conclui a liberação global do personagem único.
