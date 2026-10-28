# Peças visuais independentes

O compositor existente agora aceita 15 slots. Não há novo sistema de personagens,
inventário ou saves. Este contrato organiza as futuras artes por equipamento.
Nenhum PNG foi alterado, produzido ou ativado nesta etapa; custo PixelLab: zero.

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
à frente do torso quando a pose exigir. Luvas usam profundidade 35, cabeça 45 e
óculos 47. O autor da arte deve conferir oclusões reais, inclusive mãos/arma e
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
