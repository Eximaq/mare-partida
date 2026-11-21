# Equipamento HD por camada
A arte do corpo e o encaixe já selecionados são a referência. Este lote usa as
camadas autorais de cada peça, sem materializar nova prancha para cada combinação.
O seletor conserva os encaixes HD existentes. Uma fonte nova só é aceita quando
corpo, geometria, cadência, região da peça e orientação espelhada correspondem.

## Validado nesta rodada
- Reprodução do inventário e do mapa: Casaco 6 + Calça 22 com penteado salvo;
  repouso e caminhada Sul/Leste/Oeste e soco Sul no masculino. Remover a Calça
  22 restaura os pixels do visual anterior. Calça 22 isolada no repouso Sul
  também mantém o penteado. O inventário usa o mesmo repouso HD em escala 3×.
- Calças 21 e 133 sobre as fontes de torso compatíveis. Prova de troca sobre o
  Casaco 6: 21 repouso/caminhada Sul/Leste/Oeste; 133 repouso/caminhada Sul.
- Luvas 25/26 sobre o corpo masculino no repouso Sul. Luva 25 com Espada 0 e
  Casaco 6 no repouso/caminhada Norte. Bota 9 com Espada 0 e Casaco 6 no repouso
  Sul; Bota 183 com Espada 0, Peitoral 179 e Calça 182 no repouso Sul.
- Nas provas de espada, o porte aprovado foi mantido; não há nova posição.

## Medição, não alegação de cobertura total
A auditoria representativa (node tools/audit-hd-slot-transitions.cjs) mede
30.744 trocas e 27.216 consultas distintas, em ambos os corpos. 175 novas
consultas chegam ao HD; nenhuma seleção anterior mudou. Dessas transições,
223 deixaram de trocar de HD para compatibilidade. O seletor não prova por si
só a roupa rasterizada; a suíte Canvas compara os pixels fora da máscara, a
identidade das peças, a retirada exata e o inventário nos recortes acima.

Os casos sem camada compatível continuam pendentes: ainda não é seguro retirar
todo o modo de compatibilidade sem esconder peças. Não publicar essa remoção
como concluída com base num resultado parcial.

## Segundo lote
- Casaco 6 + Calça 22 também preserva o corpo, o cabelo e a roupa no soco
  Norte/Leste/Oeste. O repouso e a caminhada Norte dessa combinação ainda
  não têm encaixe compatível comprovado na região da canela e do pé.
- Calça 168 no repouso/caminhada Sul e Calça 133 na caminhada Leste/Oeste,
  com Casaco 6. Somente os próprios pixels da calça são adicionados.
- Luvas 25/26 masculinas avulsas em repouso Norte e caminhada Norte/Sul.
  No feminino, botas 176/183 no repouso Sul com Peitoral 151 e penteados
  salvos não alteram a aparência. Com Espada 0, a Bota 9 no repouso Sul
  usa a própria camada com os Peitorais 7, 137 e 144.
- Manopla 14: restaura a pose HD aprovada do Ciborgue masculino de cabelo
  Original azul nos oito tons em repouso e caminhada nas quatro direções.
  Não migra penteados diferentes, ataques ou conjuntos extras nessa rota.

As suítes do segundo lote comparam retirada/restauração, assinatura de pose,
paleta salva, limites da camada e silhueta. Não alteram as demais fontes
do personagem nem afirmam que todo caso sem cobertura deixou o legado.

Na mesma matriz de auditoria, este segundo lote evita mais 168 regressões para
compatibilidade (11.438 → 11.270), sem trocar ou perder seleções HD existentes.
A matriz de 516 casos por corpo permanece idêntica. As verificações abrangem
o seletor e as poses testadas, não todas as combinações possíveis.
