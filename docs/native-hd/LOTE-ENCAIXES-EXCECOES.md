# Segundo lote de exceções por família de pose
Base: PR #348 em `acfde4af`. Os encaixes usam camadas e composições já existentes. Sem novo sprite, alteração da animação, nova escala, novos pixels de arte, mudança de equipamento no save, merge ou publicação.

| Família | O que entrou | Escopo comprovado |
| --- | --- | --- |
| Caminhada masculina Sul | Retirar e reequipar B155 sem trocar o resto do conjunto. | C151/G152 e calças 140/147/154/161/168/175/182, aparência Original. 112 quadros vestidos idênticos à versão anterior; retirada muda pixels apenas na máscara da bota. |
| Soco masculino | Combinar parte superior do soco com luva e base inferior comprovadamente imóvel com bota, sem deslocamento. | C151/P133. 288 combinações novas de luvas/botas/direções no Original. 64 quadros representativos com comparação regional no renderizador. B155 continua disponível nas exatas. |
| Soco masculino Norte | Mesma família com cor do personagem, usando máscaras verificadas para cabelo e anatomia. | G26/G159 e nove botas estáticas. 18 combinações no perfil padrão, 144 quadros; 32 quadros extras com duas paletas distintas. |
| Caminhada feminina Sul | As dez botas compartilham as mesmas quatro camadas independentes no relógio autoral de 40 quadros. | C151, sem calça. Três aparências verificadas em 1.200 quadros. Com calça, as rotas existentes de B155 e sem bota seguem iguais, com 280 quadros vestidos de controle. |
| Masculino Sul: peitoral e calça | Aplicar o tom da pele às mãos reparadas e escolher apenas os pixels da íris, sem atingir o rosto. | Peitorais 6/137/144 e Calça 21, repouso/caminhada/soco, com penteado e formato de olho Original, incluindo as cores padrão e uma paleta alternativa. 18 configurações de pose/equipamento/paleta, 150 quadros. |

## Exceções que continuam

- A B9 masculina não substitui a B155 nessas sete calças ao sul: a costura precisa de ajuste próprio por fase. A troca direta mostrou pixels a mais de pele junto ao cano nas 112 fases. Não aplicar as máscaras da B155 na outra bota.
- No soco masculino a B9 é da família com pernas animadas. Não unir com as botas estáticas nem com o corpo descalço. Para as outras luvas, não ativar paleta sem provar posse de pixels de mão/luva.
- Na caminhada feminina Sul, não promover as novas trocas com calça só porque o encaixe reconstrói o quadro: a B9 com Calça 133 expôs pele adicional na costura durante contatos. As novas combinações com calça ficam fora. A primeira triagem encontrou seis candidatas sem pixels novos de pele no perfil oliva (B9/B176 com P147/P168/P182); ainda falta a prova visual/por paleta antes de liberar.
- No repouso feminino Sul, a bota se separa, mas os conjuntos vestidos e descalços usam versões diferentes do Peitoral 151. Não substituir peitoral para corrigir bota. Nas outras direções, não transferir a prova da caminhada Sul sem verificar a própria pose.
- No soco feminino, 320 quadros vestidos reproduzem-se exatamente com o inferior HD congelado recortado do repouso; a rota descalça atual usa pernas dinâmicas e diverge em todos os 32 quadros. A prova fica separada e não substitui o soco descalço.
- A Espada 0 feminina tem fonte editável já arquivada no próprio PR: 120 registros de bota/luva/calça, quatro direções, 1.503 PNGs verificados. Teste isolado de 120 seleções e 96 quadros representativos. Ainda não ligada ao jogo neste lote: falta integrar o arquivo existente ao build e preservar o contrato das rotas já ativas. As armas não foram alteradas.
- O lote de máscaras do Sul não comprova penteados ou formatos de olho alternativos, nem outras direções e famílias de roupa.


## Comparação e verificação

No recorte deduplicado de 135.552 consultas ao seletor de mundo (dois corpos, aparência Original e padrão, combinações representativas de catálogo e kits), 349 casos passaram de nenhuma rota para HD completo: 288 de soco masculino Original, 18 de soco masculino Norte padrão, 7 retiradas B155, 9 de peitoral e calça com aparência padrão e 27 de caminhada feminina Sul. As 36.990 rotas completas anteriores continuaram completas, e a ocorrência parcial não perdeu camadas. A contagem mede cobertura do seletor, não auditorias manuais nem sprites; não somar diretamente com a contagem anterior de escopo diferente.

Build estático verificado, 55 testes focados de runtime/consumidor e 3 testes Python passaram, além das novas regressões de renderização das botas, do soco e dos materiais. Os scripts reais do mapa, em Canvas local, confirmaram retirar e reequipar a B155 no Sul (P140 e P182, 16 quadros cada). A suíte ampla não equivale a uma aprovação: o teste histórico de cabelo feminino já falhava no estado anterior, e as suítes longas de capacetes não completaram neste ambiente.
