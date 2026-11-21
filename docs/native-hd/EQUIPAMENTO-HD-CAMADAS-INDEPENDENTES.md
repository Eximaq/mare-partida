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
