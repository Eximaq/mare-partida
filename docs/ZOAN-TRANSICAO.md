# Transição comum de transformação Zoan

Atualização de 26/10/2026. Branch feature/zoan-transform-transition sobre origin/main 9d227ad.

## Comportamento

Todas as frutas com family=zoan usam explosion-take-2 ao trocar a forma humana pela animal ou retornar. O efeito acompanha os pés do personagem e é desenhado na frente do corpo; a nova forma é revelada gradualmente conforme a fumaça se dissipa. A transformação continua usando as mesmas regras, atributos, custos e recargas. Nenhuma invulnerabilidade ou dano foi adicionado.

PNG e JSON fornecidos pelo proprietário são copiados sem alterar bytes. Sequência original: 17 quadros de 64×64, 71ms cada, total de 1207ms, reprodução única. O fim remove o overlay sem repetir ou segurar o último quadro. Manifesto com hashes em assets/akuma/zoan-transition/manifest.json. Importação: python tools/import_zoan_transition.py <pasta-das-fontes>.

## Integração para as próximas frutas

zoan-transition.js observa a identidade da forma, sem lista de IDs. O jogo integra a observação ao botão T, à sincronização de equipamento, ao tick e à renderização. Assim, novas Zoans cadastradas no catálogo e usando game.zoanTransformed/equippedZoan recebem a mesma transição automaticamente, inclusive transformações automáticas ao equipar.

A cobertura usa o maior envelope entre a forma anterior e a seguinte, margem de 20% e o conteúdo visível do primeiro quadro. O padrão de 128×128 atende às sete Zoans atuais. Formas futuras maiores podem declarar transformationVisual: {width, height} no registro da fruta. O modificador visual Titã entra no cálculo. Não é preciso criar um VFX por fruta.

Apenas mudanças reais de identidade disparam a transição; buffs na mesma forma não a reiniciam. Rejeição da API não inicia o efeito. Troca de mapa, morte/respawn e reload descartam o estado visual anterior. A forma atual é a referência inicial da nova sessão, evitando uma transformação fantasma ao carregar. O estado transitório fica na sessão e não é gravado no save. A animação usa o relógio visual do mundo.

## Arquivos e compatibilidade

Novos: zoan-transition-data.js, zoan-transition.js, fontes/manifesto em assets/akuma/zoan-transition, importador e testes. game.js chama o componente comum; index.html e ui-preview.html carregam os módulos; tools/build_pages.py os inclui no preview estático com caminhos relativos. Nenhuma alteração nas regras Python de transformação ou nos sprites das formas. Saves, IDs e índices anteriores preservados.

Reversão: reverter o commit desta branch. Nenhuma migração de dados é necessária. Sem geração de imagens ou custo de PixelLab.

## Validação

Testes próprios: node tests/zoan-transition.test.cjs e node tests/zoan_transition_browser.cjs. Unitários verificam hashes, duração, todos os quadros, sete Zoans, ID futuro, cobertura ampliada, revelação do corpo, expiração e novo estado de sessão. Navegador verifica botão/atalho T em ambos os sentidos para as sete frutas, retirada de equipamento, troca de mapa, reload, exclusão de Paramecia e rejeição do serviço. Capturas recentes ficam fora do Git.

Resultado em 26/10/2026: 81 arquivos de testes Node e 92 testes Python aprovados. Navegador em 1920×1080, 1366×768 e 1280×720, serviço Python e preview estático aprovado. Build Pages e diff check sem erros. Capturas locais zoan-transition-1366.png e zoan-transition-animal-1366.png, geradas nesta atualização e mantidas fora do Git.
