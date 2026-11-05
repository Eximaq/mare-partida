# Efeitos de classe — revisão local, aguardando proprietário

Fôlego de Ferro e Impacto de Âncora do Lutador usam os exports PixelLab fornecidos pelo proprietário. Nenhuma geração nova ou alteração de atributos.

- Fôlego: snow-take-1 (1), 41 quadros de 256 px. Reprodução 3×, 1,367 s, uma vez por uso; envolve o corpo real (escala 1,4 da altura, centro corporal). Não troca a renderização do avatar. Proteção continua 7 s, energia 20 e recarga 14 s.
- Impacto: snow-take-2, 21 quadros de 256 px. Reprodução 8,4×, 250 ms, largura 88 px sobre o alvo. Dispara no desconto efetivo de vida. Ataques básicos continuam com punch. Energia 17, recarga 8 s e dano preservados.
- Fontes PNG e JSON originais preservadas em assets/combat-vfx; dados normalizados no rules.json e combat-vfx-data.js. Um carregamento por efeito, sem interpolação ou loop e sem recoloração pela arma.
- Eventos online usam a mesma apresentação; o impacto espera o evento damage do alvo após o skill do Lutador. Não há alteração de servidor ou de protocolo.
- Validação local: dois modelos reais no mapa; cura, custo, recarga, momento do dano e encerramento dos efeitos verificados em navegador isolado. Não houve conexão ao banco do colaborador nem teste multiplayer real.
- Sem commit, push ou PR a pedido do proprietário. Aguardar próximos arquivos de skills antes de publicar.

Impacto de Âncora revisado: preparação e recuperação usam o ataque real de soco. Na base sem controlador legado, ciclo de 500 ms com contato em 250 ms; dano e VFX são disparados uma única vez nesse contato. Evento online de dano alinha a pose ao contato quando o snapshot chega antes do relógio visual.

Revisão adicional: Ponto Fraco (300 ms), Dança (400 ms), Disparo Preciso e Chama Concentrada (voo até colisão), Rajada (350 ms), Tempestade (800 ms), Protocolo (650 ms), Blindagem (7 s), Maré (800 ms) e Bênção (8 s + encerramento). Bênção usa loop 0–33 e depois quadros finais. Áreas preservam alcance mecânico; novos efeitos têm paleta fixa.

Blindagem e Bênção: somente regiões centrais cinzentas conectadas foram tornadas transparentes no PixelLab Workbench; originais do proprietário preservados. 115732 e 238644 pixels respectivamente, verificação exata de alterações restritas a alfa. Recursos Workbench: ae835e4c-84c5-4ba4-ba5b-01204e23de5d, c1987925-8473-4442-9026-b18426f27742, a74c1647-b0ab-4434-aeee-1cef5a3e7b41, 13c5d44d-61f9-4366-a313-c95bef578094, da2f1269-cb32-43fc-8545-1b3ce1d71210, 9fa1ff86-f8be-4302-9afc-b7dc7ed72f10.

As dez habilidades foram acionadas em navegador isolado com o modelo masculino; nenhum erro de execução observado. Capturas e GIFs ficam fora do repositório. O backend real não foi validado; nomes de projéteis enviados ao servidor permanecem gunner/mage.

Publicação autorizada em 05/11/2026. Protocolo passa atrás de todas as entidades, centrado no ponto de ativação e recortado pelo raio real range + 125 usado na seleção de alvos, sem largura fixa de 580 px. Corte de Maré: 21 quadros em 250 ms a partir do dano no contato; Arco do Horizonte: 41 quadros em 350 ms com ataque e dano de área no contato. Ambos reaproveitam os exports do proprietário; atributos e recargas mantidos. As duas habilidades foram acionadas e capturadas em navegador isolado.
