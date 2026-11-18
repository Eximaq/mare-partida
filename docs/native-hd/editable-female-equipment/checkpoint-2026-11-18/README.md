# Checkpoint do feminino: fontes editáveis e testes locais

Este commit no rascunho preserva o trabalho desde o ponto de pausa anterior. Ele não altera carregadores, seletores, índices de produção ou builds do jogo. Nenhum merge, deploy ou ativação está incluído.

## O que está neste commit

| Frente | Fontes e escopo verificado localmente |
| --- | --- |
| Adagas 12/13/71–74 | Catálogo portátil de camadas; 30 peças nas quatro direções da Adaga 12, 960 quadros pelo seletor em cópia local. Seleções e testes de isolamento para as demais armas da família. |
| Espada 0 / peitoral 151 | 120 registros de camadas, com 960 quadros testados pela seleção normal em cópia local no visual comprovado. Fio para baixo só no Leste/Oeste; Norte/Sul intactos. |
| Pistolas 114 | Norte/Sul editáveis, com 10 luvas, 10 calças e 10 botas por direção. Laterais em pacote próprio, 30 peças por direção, espelhamento RGBA verificado. Algumas aparências e a remoção de peças laterais ainda não estão certificadas. |
| Fuzil 113 | Norte/Sul, 30 peças por direção na aparência original; loader portátil e fontes em camadas. Inclui a verificação de cada peça e preserva a versão dos movimentos mostrados. |
| Orbe 17 / Cajado 31 | Bases editáveis na versão mostrada, calças/botas/luvas de todas as direções e testes de troca/retorno. G166 lateral é encaixe posterior apenas da luva, não alteração do movimento. Variações documentadas de pele, cabelo e olhos; 122/128 preservados. |
| Soco / Tecnologia | Camadas verificadas nos movimentos e direções compatíveis, com controle de arma/mecanismo e outras peças inalteradas. Casos próprios 109/117 protegidos. |
| Caminhada | Pilotos autorais em cópia local: 10 botas no Sul em P147/G152; 10 luvas no Norte em P21/sem arma; luvas laterais compatíveis, incluindo fonte e provas separadas do remate G180. Não certifica todas as calças, combinações de caminhada, repouso ou todas as aparências. |

O teste rápido no fluxo de mundo com Orbe Sul e aparência personalizada preservou o movimento, a aparência e as outras peças ao trocar a luva ou retirar a bota depois da correção local. A reposição retornou ao quadro inicial em RGBA. A caminhada desse mesmo conjunto ainda seleciona a rota anterior. O teste completo no navegador não foi concluído; esse ponto não deve ser inferido dos testes locais.

## Como usar

- O manifesto registra SHA-256, tamanho e intenção de cada arquivo. O verificador pode ser executado sem rede com `python3 verify.py`. Arquivos maiores foram divididos em partes binárias para transporte; `python3 verify.py --materialize ./pacotes` verifica e reconstitui os arquivos originais, sem alterar as fontes.
- Os pacotes contêm camadas editáveis, catálogos, patches isolados e provas conforme descrito nos arquivos internos. Quando dependem de assets já existentes do repositório, não duplicam esses recursos. Nenhum composto de personagem ou quadro de vídeo foi usado para substituir a fonte editável.
- Preserve os arquivos anteriores do rascunho e a pose original. Antes de ativar qualquer pacote, validar a seleção no jogo com equipamento e aparência reais, inclusive ausência de uma peça, sem derrubar o HD das outras. Não confundir este checkpoint com uma versão pronta para merge ou publicação.
