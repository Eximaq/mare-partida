# Animação de ataque proporcional à velocidade

## Contrato de tempo

O motor usa segundos internamente. Para um ataque básico, duration = max(0.15, 1 / attackSpeed). Assim, 1 ataque/s ocupa 1000 ms; 2 ataques/s ocupam 500 ms; velocidades extremas ficam limitadas a um ciclo de 150 ms. O mesmo valor rege a animação e o intervalo do próximo ataque.

Cada frame ocupa duration / frames. O progresso é elapsed / duration, limitado a [0,1], e o índice é min(frames - 1, floor(progress * frames)). Uma folha com quatro frames ocupa 250 ms por quadro em um ciclo de 1 s, ou 125 ms em um ciclo de 0,5 s. Não há frames inventados, espelhamento ou mudanças de pixels.

combat-animation.js aceita attackSpeed ou attackDuration no play(), expõe progress/currentFrame/frameDuration no snapshot e preserva o progresso ao receber setAttackSpeed(). O mínimo também vale para uma duração explícita de ataque. Sem essas opções, habilidades, hurt/death e clipes existentes mantêm seus tempos autorais.

## Impacto e cancelamento

O evento é comprometido uma única vez quando progress alcança hitFrameRatio. Precisão, crítico, dano ao HP e VFX de contato são calculados nesse evento. Deltas que atravessam o instante de impacto não o perdem nem repetem. Mudanças de velocidade não reiniciam a animação nem liberam outro impacto. Morte cancela a ação pendente.

Os humanos preservam impact_frame e direction_impact_frames dos metadados existentes; esses campos usam índice começando em zero. A proporção é impact_frame / quantidade de frames daquela direção. hitFrameRatio explícito permite configurar uma proporção diretamente.

Formas Zoan usam um controlador básico com o mesmo relógio, separado das habilidades. Na ausência de metadados de contato, o frame padrão é floor(frames * 0.45), também configurável por impact_frame/hitFrameRatio no clip. Alcance, linha de visão e alvo vivo são reavaliados no impacto. Trocar forma, morrer, sair do mapa ou receber controle cancela o ataque pendente; iniciar uma habilidade de ataque Zoan também o cancela. Buffs pessoais da Girafa e do Lobo podem acompanhar o golpe atual.

Movimento aguarda a conclusão do básico como nos personagens humanos com controlador. Uma transformação sem folha de ataque carregada aguarda o carregamento. As combinações humanas sem arte de combate aprovada continuam com a aparência de fallback existente durante o ciclo; esta atualização não produz nem aprova sprites novos.

## Renderização e integração

- game.js agenda e avança os ataques básicos, preserva o alvo e usa o evento de impacto existente. O bônus de velocidade da Aura Sanguinária respeita o novo piso de 150 ms.
- faction-sprites.js e os renderizadores Zoan recebem progress para escolher o frame, independentemente do FPS nativo.
- paper-doll.js, paper-doll-assets.js e paper-doll-review.js aceitam o mesmo progresso, mantendo flags de aprovação, fallback e isolamento DEV.
- Habilidades de fruta, combos multihit, investidas, DoTs e suas recargas mantêm seus contratos próprios. O backend não mudou: o protótipo continua com cálculo de combate local, sem anunciar autoridade de servidor nova.
- Nenhuma migração de save ou alteração de índices de itens.

## Validação

- tests/attack-speed-animation.test.cjs: 2/3/4/5/9 frames, velocidades diferentes, piso, fronteira exata de impacto, hitFrameRatio 0,6, delta longo, retiming, direção e morte.
- tests/attack-speed-rendering.test.cjs: progresso prevalece sobre FPS/tempo em humanos, Paper Doll, Leopardo, Girafa e Lobo.
- tests/attack_speed_browser.cjs: 56 cenários (sete identidades com quatro velocidades e 28 combinações humanas), além de retiming, alcance, morte, troca de forma e cadência real do Auto-Hunt em ciclos de 500/150 ms. Fixture privada existe apenas na resposta interceptada de teste.
- Regressões dos controladores, sprites, Paper Doll e frutas; build Pages e inspeção de capturas de impacto fora do Git.
