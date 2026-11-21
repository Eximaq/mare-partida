# Auditoria por peça de referência

A unidade de validação é a **pose da região que recebe a peça**, não cada combinação de equipamento. Abrangência: repouso, caminhada, soco, espada, disparo, foco/cetro, adagas e tecnologia, nas quatro direções. Quando o catálogo tem várias armas na mesma família, verificar as próprias posições/oclusões de contato. O mesmo relógio, os mesmos ossos ou uma seleção HD por si só não demonstram equivalência.

| Peça-modelo | Prova suficiente para reaproveitar | Separar quando… |
| --- | --- | --- |
| Luva 26 | Mesma mão/punho, coordenadas, ordem, lado, profundidade e fonte independente. | A empunhadura ou a máscara que restaura a mão muda com a arma. |
| Bota 9 (B155 como controle) | Perna, barra, sola, cano traseiro/frontal e pivô idênticos por fase. | A perna muda em caminhada, a bota cruza o outro pé ou surge pele na barra. |
| Calça 168 (feminino) / 133 (masculino) | Pelve e perna, barra em relação à bota, ordem das camadas e própria pose/oclusão. | Capa/peitoral cobre a barra, a perna é dinâmica ou falta posse dos pixels da roupa. |
| Peitoral 151 | Tronco, manga, costura com luvas, profundidade e referência de arte da própria família. | O braço cruza a manga ou uma versão do peitoral/da capa usa outra pose. Sobretudo no peitoral não é o slot de capa equipável. |

Acompanhar separadamente provas de encaixe, rotas novas, alcance no PR e produção. Não contar hash igual ou seleção de fonte como equipamento completo.

## Primeiro lote deduplicado

- **Luva/Calça masculinas:** G26 como referência e dez luvas × oito calças no repouso e caminhada Norte/Leste/Oeste com C151+B155, nos perfis Original. Das 480 combinações de seletor, 378 não existiam no HEAD anterior. 306 quadros Canvas de referência: G26/G145/G180 com P147/P175, verificando que trocar a calça ou a luva só muda o alfa da peça correspondente. Nenhuma rota de perfil salvo foi substituída.
- **Botas femininas:** B9 como referência, mesma pose estática e quatro passes das dez botas no repouso Norte C151; 40 testes equipar/retirar com Original, padrão, Porcelana e Ébano. No Original, saída RGBA igual à fonte anterior. Demais direções de idle, caminhada ou ataque não herdam esse encaixe.
- **Luva 26 feminina:** disparo W113 Norte + C151, duas mãos só nas fases 0/7 do registro atual; extrai quatro PNGs do arquivo existente. 24 quadros de três perfis, seis fases intermediárias iguais e mudança apenas onde estão as mãos/luvas. Outras armas usam seus próprios pontos de contato.
- **Calça 168 feminina:** repouso Sul sem outro slot visual. O idle original e o quadro 0 da caminhada compartilham a mesma fonte, poses, escala e material. A calça usa o desenho da própria caminhada, sem trocar o restante do visual. Verificado em três perfis, incluindo um com penteado, pele e olhos personalizados.

## Próximos grupos ou exceções

- **Botas masculinas:** B9 idle coincide com a fase inicial da caminhada em cada direção; outros 15 quadros são distintos. No soco B9, há 8 poses Sul, 5 Norte e 7 em cada lateral, sem reaproveitar a caminhada. B155 tem inferior imóvel no soco; o idle da mesma direção é controle. Há cinco armas longas no Norte com inferior idêntico e sem arma/mão nessa área; falta encaixar B9 uma vez e então auditar as cinco.
- **Luvas masculinas:** soco e foco Sul têm relógio/ossos parecidos, mas zero dos oito rasters de mãos coincidem. Cetros 31/123–127 compartilham empunhadura no Leste; no Oeste W31 tem regra de espelho distinta. Adagas laterais reaproveitam corpo, mas cada arma tem máscara própria de contato.
- **Feminino:** tecnologia e arma de fogo compartilham o `body-clothed` em 32 quadros do acervo (quatro direções × oito poses). O mesmo recorte de material pode servir às duas famílias depois de provada a pele junto ao pescoço/pernas. As mãos/armas não ganham equivalência por isso. No soco, inferior vestido imóvel versus descalço dinâmico; não substituir um pelo outro. A caminhada Norte/lateral não tem alinhamento completo de fases de perna.
- **Peitoral 151:** usar como controle nas famílias acima e comparar a própria fonte de tronco e manga antes de reaproveitar: no repouso feminino Sul, as versões vestida e descalça não são o mesmo peitoral fora do contato de bota. Não corrigir bota trocando peitoral.

Todos os resultados daqui são locais no seletor/Canvas ou leitura das fontes. Sem merge, site publicado, nova arte ou alteração do save.
