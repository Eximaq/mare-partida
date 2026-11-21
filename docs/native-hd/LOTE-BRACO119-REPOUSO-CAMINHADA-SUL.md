# Braço Mecânico 119: repouso e caminhada Sul

O save masculino do Ciborgue com o Braço 119 usa as duas peças originais do braço mecânico nas animações HD já existentes, sem trocar o corpo inteiro. O recorte validado usa o penteado original, cabelo Preto, olhos Azuis e pele natural Clara ou Ébano. A opção só vale na renderização do mundo, com o item original sem outras peças; ataques e outras direções preservam o comportamento anterior.

Os SHA-256 das duas partes da própria pose Sul ficam travados com o encaixe original. As duas texturas recompõem exatamente os recortes do quadro original e não tocam nenhum pixel da máscara autoral de pele daquele quadro. A ligação substitui apenas as duas camadas do braço direito, sem deslocar a outra mão, os pés, a cabeça ou o pivô. O caso mais justo do cotovelo conserva quatro contatos de pixel opaco no quadro 11.

O teste `node --expose-gc tests/rework-w119-south-carry.cjs` compara o desenho do mundo em uma fase de repouso e 16 de caminhada, em dois tons. Ele verifica geometria, pele/cabelo e 45 pixels de íris, estabilidade do metal e preservação de todos os pixels fora dos materiais autorizados.
