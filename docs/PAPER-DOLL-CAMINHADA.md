# Paper Doll — primeira caminhada modular

[Prévia interativa](../pixellab-pip-generations/paper-doll-walk-fit-20261021/preview.html) · [Bancada com o pacote](../tools/paper-doll-inspector/index.html?pack=walk-south) · [PNG animado sem perda](../pixellab-pip-generations/paper-doll-walk-fit-20261021/walk-south.png).

## Cobertura e limites

O conjunto reúne Idle nas quatro direções, preservado da etapa anterior, e **Walk/south com oito frames reais a 8 FPS**. Corpo, cabelo e roupa são camadas próprias de cada pose. A espada usa a imagem original e sockets medidos na mão, conforme a exceção autorizada para peças rígidas.

É um pacote de revisão, com `approved:false` em todas as peças. O catálogo de produção permanece indisponível; não houve ativação de personagem incompleto na aventura. Faltam Walk norte/oeste/leste e ataques nas quatro direções. Não há alteração de saves, classes, facções, física, inventário, equipamento, câmera, dano, impactos, Haki ou Zoan.

## Causa e correção do bloqueio anterior

O candidato MiniMax preservava melhor a identidade, mas escondia a mão usada para carregar a espada. Os oito frames originais foram reaproveitados, sem repetir a geração da caminhada. Uma edição PixelLab por máscara corrigiu exclusivamente o braço direito para uma guarda de transporte. Auditoria independente confirma zero mudanças fora da máscara, oito frames distintos e preservação dos pés. Apagar pixels do braço antigo **dentro** da máscara é permitido nesta edição do corpo; isso não é extração de roupa.

O corpo corrigido foi usado como fonte independente para cabelo e roupa. Cada saída contém apenas pixels da peça em sua região autorizada. As máscaras protegem olhos, mão de transporte e antebraços; o contexto lateral guia a paleta e o figurino, não copia a pose estática da referência. Não houve retoque manual, espelhamento, criação de frames por repetição ou correção artificial do movimento.

## Contrato e montagem

- Originais: atlas nativos 256×128, quatro colunas e duas linhas de células 64×64, ordem original dos oito passos. A referência retornada no índice zero do job anterior continua preservada separadamente, sem entrar no ciclo.
- Rig: `human-v1`, frame 84×84, pivô 42/65. Padding fixo 10/13 em todos os passos; os pés variam naturalmente durante a passada. Nenhum deslocamento por frame foi usado para estabilizar a anatomia.
- Folhas finais: corpo/cabelo/roupa 672×84, sem escala. Idle continua 336×336, sul/norte/oeste/leste.
- Espada: fonte 64×64, âncora 20/36. A mão original oclui o cabo; `walk.zIndex:10` coloca a arma atrás do corpo. Os sockets são próprios dos oito passos e independentes dos quatro sockets Idle.
- Composição: arma → corpo → roupa → cabelo. Cache e relógio existentes são reutilizados. Outras poses resolvem fallback atômico, sem composição parcial.

`prepare_inputs.py`, `audit_body.py`, `inspect_layer.py`, `plan_attachment.py` e `assemble_review.py` apenas preparam, verificam e montam arquivos locais. Não iniciam gerações. A montagem verifica hashes congelados, regiões protegidas, contato e APNG lossless com exatamente oito frames.

## Custos e procedência

Três chamadas `inpaint_image_pro_flash`, cada uma com cobrança final de 9 gerações: braço, cabelo e roupa. **27 confirmadas nesta etapa**. Acumulado conservador da execução: **87 de 100**, sendo 84 com cobrança final confirmada, 2 previamente reportadas pelas ferramentas e 1 estimada de job anterior sem cobrança final exposta. Não se presume reembolso. O teto não obriga consumir o restante; nenhuma nova geração é necessária para montar ou revisar este pacote.

IDs, parâmetros exatos, máscaras, fontes e hashes estão no diretório do lote. `walk-fit.blueprint.json` é a receita reproduzível, sem credenciais, dados de conta ou links temporários de upload. Executar a receita paga novamente exige verificar a autorização vigente; executar o assembler é gratuito.

## Inspeção e testes

A prévia permite alternar Walk/Idle, controlar cada frame, reproduzir, ocultar cada camada e mostrar o pivô. A comparação nativa apresenta corpo original, braço corrigido e composição. O pacote pode ser aberto pelo celular na bancada sem upload de arquivos; somente pacotes locais explicitamente permitidos são carregados.

O ensaio de mundo usa opt-in isolado no navegador, sem promover flags de aprovação: caminhada frontal modular, outras caminhadas e ataque legados, dano real, Haki, bypass Zoan, cache limitado e formato de save preservado. Isso valida integração parcial; **não representa combate modular completo nem conclusão da Fase 1**.

Resultados executados serão registrados após os testes. Capturas ficam no diretório ignorado `docs/evidence-paper-doll/` e no artefato do CI, sem evidências em massa no repositório.
