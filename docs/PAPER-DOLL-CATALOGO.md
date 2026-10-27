# Catálogo de aparência por IDs

## Escopo e estado artístico

Criação e editor usam `paper-doll-look-data.js`. `paper-doll-look.js` valida IDs,
gera ambos os seletores e resolve preferências para peças do manifesto.
`paper-doll-review.js` entrega a configuração ao compositor existente, também
usado pelo mundo, retrato e prévia do inventário. Não há outro compositor ou
relógio de animação.

Continuam disponíveis **um cabelo e uma roupa reais**: Curto preto e Colete azul
e linho. Sem cabelo e Somente corpo-base ocultam camadas; não são alternativas
artísticas. O colete ferrugem, cabelo candidato e sabre experimental do PR #133
não foram importados ou ativados. Nenhum PNG ou manifesto foi alterado. Esta
etapa consumiu **zero gerações PixelLab**.

## Contrato do catálogo

Os grupos v1 são `hair` e `outfit`, com `label`, `slot` e `options`. A roupa usa
`equipmentSlot:'coat'`, preservando a prioridade do torso equipado. Cada opção
tem `id`, `label`, `approved` e exatamente uma destas formas:

- `useDefault:true`: peça padrão daquele slot no manifesto.
- `hidden:true`: ocultação explícita, sem representar uma peça nova.
- `pieceId`: ID de uma peça real aprovada, com cobertura completa.

Exemplo de contrato **fora do catálogo ativo**:

```js
{id:'cabelo-futuro',label:'Nome aprovado',approved:true,pieceId:'peca-aprovada'}
```

IDs começam por letra e usam letras minúsculas, números e hífen, até 64 caracteres.
Defaults ausentes, IDs duplicados e opções ambíguas são rejeitados. O catálogo é
copiado/congelado e os rótulos são escapados. `approved:false` não é selecionável.
`createCatalog(data)` permite testar novos dados sem alterar o catálogo global.
Os aliases de peças das suítes existem só em memória; não são arte nova.

## Persistência e equipamentos

Mantém-se `paperDollLook:{version:1,hair:'short-black',outfit:'navy'}`, sem migração,
nova chave de armazenamento ou gravação automática. Saves antigos usam defaults
sem mutação. IDs desconhecidos são normalizados na leitura e recusados na
aplicação. Um ID conhecido com imagem indisponível **permanece salvo**; somente
sua apresentação retorna ao padrão.

O torso equipado vence a roupa cosmética, inclusive se o item usa arte padrão.
Removê-lo restaura a preferência. Armas continuam em
`pack.bindings.weapon.items[def]`, com fallback para a arma inicial da classe e
categoria. Uma aparência de arma pode futuramente usar o mesmo `def`, sem criar
item ou regra de gameplay. Zoan, isolamento DEV, classes, facções e eventos de
combate continuam no caminho existente.

## Cobertura e fallback

Alternativas devem corresponder ao rig, slot, dimensões, FPS, frames e loop.
Exige-se cobertura de todas as ações nas quatro direções: no rig atual são 240
poses por cabelo/roupa (16 Idle, 32 Walk e seis ataques × 32 poses). Pivôs,
offsets, sockets, oclusões e profundidade seguem [PAPER-DOLL.md](PAPER-DOLL.md).

A carga audita cada alternativa em todas as poses pelo motor, inclusive pixels.
Erro de decode, peça não aprovada ou cobertura incompleta selecionam o padrão
**para a peça inteira**, evitando trocas entre frames. O editor informa a falha
sem apagar a preferência. Defaults, armas de categoria e peças de equipamentos
são obrigatórios: falhas neles preservam o fallback atômico para o sprite antigo.

Mantêm-se seis decodes simultâneos e o cache do compositor. Não há lazy loading:
o manifesto ainda carrega todas as imagens. Medir download e memória mobile
antes de ampliar muito o catálogo.

## Como adicionar uma peça

1. Aprovar orçamento e arte em lotes pequenos. Não registrar roupa limitada a
   Idle/Walk sul como opção de produção.
2. Completar e inspecionar geometria, todas as direções e ações das sete classes.
3. Adicionar peça/PNGs ao manifesto aprovado e uma opção `pieceId` ao catálogo;
   para arma, usar o binding do item existente. Não alterar saves ou atributos.
4. Executar testes e build. A exportação reúne PNGs referidos pelos manifestos
   de produção **e** DEV; aceita apenas nomes locais planos e não copia diretórios
   de geração em massa.
5. Conferir criação, editor, equipamentos, save/reload, Zoan, desktop/mobile,
   fallback e carregamento, antes da publicação aprovada.

## Verificação desta etapa

Testes red/green cobrem IDs distintos, prioridade de equipamento, imutabilidade,
saves v1 e seletores seguros. Falhas opcionais de rede/pixels/cobertura são
testadas nas 240 poses; falha obrigatória mantém o renderizador antigo. O teste
Pages inclui recurso exclusivo de produção e rejeita caminhos externos/aninhados.

No navegador real, build estático em origem local isolada: criação com Sem cabelo
e Corpo-base; editor, aplicação/reload; Idle/Walk/Attack nas quatro direções;
layout desktop 1280×720 e mobile 390×844. Capturas ficam fora do Git. Esta
conferência preserva a arte atual e não equivale à aprovação de novas peças.
Resultados da regressão completa e build são informados na entrega/PR.
