# Trocas HD por família de poses

Base de comparação: rascunho #348, `4eb70e5`. O lote integra referências e camadas existentes, sem adicionar sprites, recriar personagens ou alterar movimento, save, bônus, escalas e transformações.

## Regra

O item usado na exportação não obriga o jogo a carregar o conjunto inteiro. Quando o catálogo registra a propriedade das camadas, um doador pode vir de um conjunto com outra peça: verifica-se o corpo restante, a fase, a direção, o pivô, as máscaras e a ordem. Só as camadas do slot selecionado entram na composição. A retirada só é permitida sobre uma base limpa comprovada. A rota exata segue preferida, salvo o registro estreito do conjunto de botas masculino que preserva a mesma luva ao trocar a bota. O mapa consulta o mesmo seletor que o renderizador, inclusive nessa precedência.

## Implementado

| Corpo e base | Ação e direção | Resultado |
| --- | --- | --- |
| Masculino, C151/P133/G152 | Repouso e caminhada, quatro direções | Dez botas no grupo. B155 entra também no Norte/Sul com passes originais do cano, sem mover a sola. A luva não muda de revisão ao trocar a bota. |
| Masculino, C151/B155 | Repouso Sul | P133/140/147/154/161/168/175/182 × G25/26/131/138/145/152/159/166/173/180. 80 combinações HD, 63 novas; 17 rotas exatas preservadas. |
| Masculino, P133, sem bota ou B9/B148 | Repouso e caminhada Sul | Nove peitorais × dois clipes × três estados de bota: 54 rotas novas. |
| Masculino, P21/P22 | Repouso e caminhada Sul/Leste/Oeste | Nove peitorais × duas calças × seis clipes: 108 rotas novas. |
| Masculino, P21/P22/P133 | Soco, quatro direções | Nove peitorais × três calças × quatro clipes: 108 rotas novas; preserva o espelhamento Oeste e a cadência de oito fases. |

Os nove IDs dos peitorais são 6, 7, 130, 137, 144, 158, 165, 172 e 179. A validação dos lotes acima usa o contrato de aparência Original. No conjunto masculino C151/P133/G152 há também seis rotas Norte com aparência normalizada: repouso/caminhada, sem bota/com B9/com B155. Foram reaproveitadas as máscaras existentes e a regra de material da pele para as pernas/pés expostos. O Norte não tem camada de íris visível. Isso não libera os demais itens, direções ou penteados. As páginas locais não equivalem a uma publicação.

## O que não se encaixa diretamente

1. **Botas femininas, C151:** as dez botas já compartilham uma base equipadas. 80 rotas de repouso/caminhada e 1.640 quadros reproduzem o original por camada. Retirar a bota sem alterar o corpo foi provado no repouso Norte. A base sem bota é de outra revisão nos outros sete clipes (três direções em repouso, quatro na caminhada), sem deslocamento cíclico que resolva a caminhada inteira. Os 40 registros de soco têm a metade inferior fundida. Não antecipar a troca de base para aumentar cobertura.
2. **Botas no soco masculino:** B8/134/141/148/155/162/169/176/183 compartilham um conjunto inferior estático. Foi possível reproduzir 288 quadros inteiros sem mudar pixels e verificar compatibilidade regional com as dez luvas. B9 pertence a outra base com pernas animadas. Não promover a mistura entre os grupos: os pixels da calça mudariam quando apenas a bota fosse trocada ou retirada.
3. **Calças e luvas masculinas:** em caminhada Sul, comparar com P133 falha para P140/147/154/161/168/175/182: as faces dianteiras da B155 têm oclusões próprias. Em repouso/caminhada Norte/Leste/Oeste, certas combinações ainda fazem G152 antiga e nova alternarem. Não substituir as exatas desses conjuntos pela variante candidata.
4. **Peitorais e calças femininos / Norte masculino:** as bases não coincidem em todos os quadros com as fontes independentes da calça. Não usar a proximidade do quadro zero para autorizar o clipe. As rotas exatas existentes continuam disponíveis.
5. **Aparência:** fora do recorte Norte já comprovado, não permitir que a seleção padrão `light/black/blue` faça alias para a original quando a íris da fonte é marrom ou quando não há máscara de pele comprovada. Isso também vale para pescoço e mãos de reparos de manga. Não ampliar a cobertura a outras paletas sem prova.
6. **Animações armadas:** a prova de repouso/caminhada/soco não cobre armas. Priorizar a recuperação das fontes editáveis existentes da espada feminina e das oito fases de tiro. Não inferir que a arte precisa ser refeita.

## Verificação reproduzível

Os testes do compositor cobrem troca, retirada e restauração do peitoral exportado com outra calça no Leste. Os testes de runtime usam o índice real, o decodificador dos ZIPs e Canvas; validam incluindo a identidade RGBA da B155 e a máscara dos deltas. Os testes do consumidor confirmam que o mapa usa o seletor canônico. A comparação direcionada do seletor antes e depois executou 20.832 consultas. Em 355, passou a encontrar uma rota HD completa; nenhuma consulta perdeu uma rota HD completa. São casos de pose, equipamento e aparência, com cruzamentos repetidos, não contagem de sprites nem confirmação visual de cada caso.
