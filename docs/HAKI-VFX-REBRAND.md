# Haki: troca dos efeitos de combate

Este lote troca a apresentação dos três Hakis, sem mudar os ícones, os
atributos, o custo de Vontade, a recarga ou a seleção de alvos.

- **Armamento:** atlas recortado do V7 aprovado. Raios negros aparecem e
  somem em pontos fixos alternados do corpo. A camada acima do personagem
  não repinta nem substitui roupa, pele, arma ou pose.
- **Observação:** atlas 4× do V5 aprovado. Foco associado à ação existente,
  brilho apenas de frente e de lado. No fluxo que já exporta uma esquiva,
  aplica-se a trilha da silhueta em camada separada. Não cria uma nova
  rolagem de esquiva no servidor.
- **Conquistador:** onda e raios negros/vermelhos reconstruídos da proposta
  V5 sem usar o recorte estático de Arlong Park. A área usa a posição no
  momento da ativação, o raio do próprio golpe e a mesma linha de bloqueio
  do combate, e não acompanha o personagem. Cliente e servidor devem
  ser publicados juntos para que o modo online receba a origem do golpe.

`tools/pack-haki-rebrand.py ARMAMENTO.zip HAKI_V5.zip` recompõe os dois atlases
transparentes a partir das fontes de revisão, mantendo os pixels e a
referência dos pés. Os PNGs históricos são mantidos no repositório, mas o
jogo não os usa para exibir os efeitos novos. O Conquistador é desenhado
em tempo real e não carrega uma animação de área fixa por mapa.

As propostas de habilidades de Espadachim não fazem parte deste commit.
