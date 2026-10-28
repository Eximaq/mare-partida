# Peças visuais independentes

O compositor existente agora aceita 15 slots. Não há novo sistema de personagens,
inventário ou saves. Este contrato organiza as futuras artes por equipamento.
Nenhuma arte nova foi gerada nem asset de produção alterado nesta etapa; custo PixelLab: zero.

| Chave existente no equipamento | Slot visual |
|---|---|
| `coat` | `outfit` (camisa/armadura do torso) |
| `legs` | `pants` |
| `boots` | `boots` |
| `gloves` | `gloves` |
| `cloak` | `cloak` |
| `head` | `head`, `eyewear` ou `accessory` legado |
| `necklace` | `necklace` |
| `belt` | `belt` |
| `ring` | `ring` |
| `charm` | `charm` ou `accessory` legado |
| `weapon` | `weapon` |

`body` e `hair` completam os 15 slots. O espaço legado `accessory` permanece
compatível. Óculos podem usar um item de Cabeça; não foi criado outro slot no
inventário. Um capacete com óculos pode declarar duas camadas do mesmo item.

## Bindings e equipar/retirar

O formato antigo continua válido:

```js
cloak:{slot:'cloak',items:{/* def existente */ 123:'capa-aprovada'}}
```

Também é aceito um conjunto atômico de camadas por item:

```js
head:{slot:'head',items:{123:{layers:{head:'capacete-aprovado',eyewear:'lentes-aprovadas'}}}}
```

Os números e IDs acima são exemplos de contrato, não itens/peças adicionados.
Cada referência precisa apontar para arte real compatível no manifesto. O slot
de destino é validado: uma luva não pode sobrescrever corpo ou arma. Dois itens
que disputem o mesmo slot não se substituem silenciosamente; o segundo usa
fallback e é relatado como conflito.

Na produção, as camadas exclusivas de equipamento são removidas da configuração
base antes de aplicar os itens efetivamente equipados. Sem capa equipada não há
capa visível, mesmo que ela tenha sido incluída por engano nos defaults. Retirar
um item remove suas camadas; torso e arma mantêm os respectivos visuais padrão
e regras já existentes. Uma atualização do equipamento altera a assinatura visual
e a chave do cache, sem alterar eventos de impacto ou relógios do combate.

## Cobertura, profundidade e fallback

Cada peça nova usa os mesmos frames, pivôs, escala e animações do rig: quatro
direções e todas as categorias de ataque (240 poses por peça no conjunto atual).
Peças de equipamento adicionais são opcionais na carga. Falha de rede, pixels,
aprovação ou cobertura mantém a configuração padrão daquele item, preservando
seus atributos. Em um item composto, todas as camadas precisam estar disponíveis;
não se aplica metade de um capacete. Armas e peças base continuam obrigatórias.

As profundidades padrão antigas foram preservadas. A capa começa atrás do corpo
(`zIndex:-10`); `directionOverrides` e `poseOverrides` continuam permitindo colocá-la
à frente do torso quando a pose exigir. Luvas usam profundidade 35, cabeça 70 e
óculos 75, acima do cabelo aprovado que declara profundidade 60. O autor da arte deve conferir oclusões reais, inclusive mãos/arma e
cabelo/capacete. Não corrigir encaixe movendo o corpo ou os eventos de combate.

A bancada enumera todos os slots e gera seletores para os bindings adicionais
presentes no pacote importado. Sem arte individual, informa a ausência. Todas
as escolhas são locais à bancada e não leem/gravam o save do jogador.

## Limite artístico desta entrega

O corpo atual conserva seus shorts e a roupa atual ainda combina camisa/colete.
Estes pixels aprovados não foram recortados nem reconstruídos. Calças, sapatos,
luvas, capas, óculos e demais acessórios precisam de camadas próprias completas
antes de mudar o visual de um item real. A infraestrutura está implementada;
o guarda-roupa artístico completo ainda não foi produzido ou aprovado.

Os testes usam aliases de clips somente em memória, como fixtures geométricas,
e não como roupas novas em produção. Cobrem composição simultânea, remoção,
troca, bundles, fallback, profundidade por direção, pivôs, cache, saves e Zoan.

## Encaixes rígidos e preparação para produção

Óculos, bonés, colares, cintos, anéis e acessórios pequenos podem usar
`kind:'rigid-attachment'`, com uma fonte real por direção e `sockets` medidos em
cada pose. Botas e luvas também admitem dois encaixes, quando a geometria real da
peça permitir reaproveitamento. `secondarySockets` tem a mesma cobertura do
primário; `null` oculta somente a peça distante. Armas, botas e luvas aceitam
rotações inteiras de 90 graus; acessórios de cabeça não podem girar a anatomia.
Calças, camisa e capa continuam exigindo frames reais, nunca um recorte rígido.

Em um acessório rígido, `occludedFrames:{north:[0,1,2,3]}` pode ocultar a peça
durante toda uma direção, mantendo a imagem fonte válida. É o caso de lentes
invisíveis de costas. Frames, imagens, encaixes e aprovação ainda são validados
antes da ocultação. Em roupas por folha, uma direção totalmente encoberta só é
aceita com todas as células declaradas e realmente transparentes. Pixels visíveis
em uma célula marcada são recusados. Corpo, cabelo e clipes legados de armas
mantêm suas restrições anteriores; não podem usar isso para omitir anatomia.

`tools/prepare_paper_doll_inputs.py MANIFESTO PASTA_NOVA` prepara os corpos sem
gastar gerações ou chamar serviços. Verifica todos os pixels visíveis antes de
retirar apenas as margens do canvas 84×84 para 64×64, usando recorte fixo
`[10,13,74,77]`, pivô `[32,52]` e sem escala. Registra hashes de origem, poses e
lotes de até 15 frames de uma mesma direção. A restauração usa somente padding
transparente, voltando ao pivô original `[42,65]`. A ferramenta recusa cortes de
anatomia e pastas de saída já existentes; não sobrescreve o trabalho anterior.

O corpo atual tem 240 poses, distribuídas em 16 lotes de 15. Esta preparação não
significa que as roupas foram geradas ou aprovadas. O proprietário optou por
gerar manualmente no PixelLab; o orçamento automático proposto não foi aprovado.
Referências ajustadas ao corpo vêm primeiro; transferências de roupa só após
validar as referências. Nenhuma autorização é inferida de uma pasta, deste
documento ou de um manifesto de entradas.

O [guia de geração manual](PAPER-DOLL-GERACAO-MANUAL.md) lista itens existentes,
prompts, direções, frames e formato de entrega. `tools/package_paper_doll_manual.py`
empacota somente os PNGs explicitamente listados, o manifesto, a ordem dos lotes
e o guia; não inclui ledgers, arquivos locais extras ou credenciais. O ZIP de
referências fica fora do Git e não entra no build do jogo.
