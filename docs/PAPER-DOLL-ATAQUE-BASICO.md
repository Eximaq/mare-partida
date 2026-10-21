# Paper Doll — ataques básicos compartilhados

## Escopo

Continuação de `ad20381` na branch `feature/paper-doll-basic-sword`. `origin/main`543c92a e as mudanças de colaboradores foram preservadas. Esta branch depende da locomoção no PR50; não há merge automático.

O proprietário confirmou que movimentos devem ser simples e compartilhados por ação/arma entre facções. Um corpo não recebe cópias por classe/facção. Idle/Walk anteriores continuam preservados; habilidades especiais, regras e tempos de combate, câmera, equipamentos e saves mantêm seus fluxos atuais. As seis categorias existentes permanecem independentes da facção: punhos, espada, disparo, adagas, tecnologia e canalização (Estrategista/Suporte).

## Arma rígida

O compositor agora aceita `quarterTurns` de0 a3 em cada socket. A mesma lâmina gira em passos de90° ao redor do cabo, sem interpolação ou mudanças nos PNGs. Anatomia e vestuário continuam com frames próprios; a exceção rígida só vale para a arma. O retângulo de cache considera as dimensões trocadas e a orientação. Campos omitidos conservam os pacotes antigos. Um valor inválido em qualquer pose força fallback completo.

A bancada permite editar posição, profundidade e orientação, restaurar e exportar JSON. Tudo fica na sessão de inspeção; nenhum campo de aparência é adicionado ao save. A correção também preserva propriedades do socket ao editar apenas X/Y.

## Produção e inspeção

Lote anunciado: até76 gerações, com primeiro movimento sul inspecionado antes de peças ou outras direções. A primeira tentativa de1 geração adicionou uma lâmina branca em dois frames, apesar da mão vazia solicitada. Foi reprovada e preservada em `rejected-body-south/`; nenhuma roupa foi gerada sobre ela. Sob a delegação explícita do proprietário, o plano foi ajustado publicamente para uma correção de1 geração dentro do mesmo teto, descrevendo só o gesto da mão. Esse ajuste não ativa auto global nem autoriza overage em dólares.

Depois do sul validado no combate, foi anunciado o ajuste aritmético para77 gerações antes de produzir as demais direções. O fechamento confirmou **77 gerações cobradas**: cinco chamadas de corpo de1 (incluindo a reprovada e sua correção) e oito camadas de9. O acumulado conservador da execução passa a227:224 confirmadas,2 reportadas em ferramentas anteriores e1 estimada de job antigo sem cobrança final exposta. Nenhum job desta entrega ficou pendente, não houve overage em dólares e o auto global não foi modificado.

[Manifesto e parâmetros exatos](../pixellab-pip-generations/paper-doll-basic-sword-20261021/manifest.json) · [Receita](../pixellab-pip-generations/paper-doll-basic-sword-20261021/basic-sword.blueprint.json) · [Bancada](../tools/paper-doll-inspector/index.html?pack=basic-sword) · [Prévia](../pixellab-pip-generations/paper-doll-basic-sword-20261021/preview.html). A reprodução exige os fontes do repositório completo; o Pages publica somente os arquivos públicos de inspeção.

## Resultado e assets

Attack/sword cobre quatro direções com8 poses/12FPS:32 frames novos por camada de corpo/cabelo/roupa,96 ao todo. Com os16 Idle e32 Walk reaproveitados, o conjunto oferece80 poses por camada anatômica/vestuário,240 frames utilizáveis. A espada não tem32 cópias: cada vista usa sua imagem anterior e8 sockets/orientações medidos. Nenhuma facção recebe uma cópia do mesmo gesto.

Corpos nativos64×64, incluindo a referência retornada no índice0, foram preservados; o índice0 fica separado dos8 frames reais. Só margens transparentes são retiradas para células32×64/atlas256×64, com teste de reversibilidade RGBA antes das peças. O corpo recebe padding10/13 em frente/costas e10/10 nos perfis; camadas compactas26/13 e26/10, rig84/pivô42,65. Não há escala, espelhamento, estabilização artificial, cópia temporal de poses ou desenho local de anatomia.

Máscaras individuais protegem mãos, antebraços, rostos e pernas. No leste, polígonos acompanham o antebraço cruzando o torso antes de se estender; no norte, a lâmina fica atrás do corpo e segue para além do ombro distante. O corte começa na pose de índice3, compatível com o impacto existente de Bento. O registro de gameplay e seu relógio não mudaram.

O Workbench corrigiu **119 pixels da camada de roupa norte** em uma nova cópia: gola/abertura frontal e costura de botões foram recoloridas para o azul já existente do painel traseiro. Corpo, mangas, silhueta, transparência, ordem e dimensões ficaram intactos. Fonte, candidato, pedido e hashes foram preservados; a montagem verifica cada recoloração e a ausência de mudanças em qualquer outro pixel. A ferramenta declara essa edição exata gratuita para assinantes, mas não expõe consumo por chamada; não se inventou cobrança0 nem se calculou custo pelo saldo compartilhado.

Os quatro GIFs transparentes preservam paleta e ordem exatas, com disposal2/loop0. Os tempos80/90ms somam670ms por sequência (limite de10ms do GIF); Canvas usa12FPS e execução única, mantendo a última pose até nova reprodução. O GIF é uma prévia em loop, não define impactos.

## Testes técnicos

Os testes Node verificam âncora do cabo, giros, fonte retangular, chave do cache e rejeição atômica. O teste Chromium compara todos os pixels de cada uma das quatro orientações com uma composição Pillow independente, usando uma espada existente. Também confere edição de posição sem perder orientação, exportação portátil com aprovação desabilitada e restauração. Esses testes geométricos não aprovam arte de personagem.

Validação local:37 arquivos Node e33 testes Python de auditoria/montagem passaram; build Pages passou. Chromium conferiu32 poses Attack,64 combinações de camadas, os4 GIFs decodificados contra composição independente dos PNGs originais, reprodução única/retorno, pivôs, bancada, fallback e celular393px. Idle/Walk foram preservados byte a byte nas folhas anatômicas/vestuário.

O ensaio normal de caçada observou ataques modulares e dano. Um harness **somente no teste**, injetado por interceptação de script, posicionou o herói e um monstro existente em piso navegável para conferir cada uma das quatro direções. Ele chama `heroAttack` e o controlador reais: nenhum dano antes do impacto3/12s, um impacto após o instante esperado e nenhum golpe extra por camada visual. A aleatoriedade só é fixada durante essa ação de teste para impedir falha aleatória de precisão. O harness não é escrito em game.js nem publicado no build.

Foram observados todos os8 frames dos4 ataques e todos os8 passos das4 caminhadas no mundo. Nessa amostra, o cache usou80 entradas/2.269.008bytes, dentro de96/4MiB. Haki, bypass Zoan, desativação do protótipo, esquema de saves e combate legado das sete classes passaram. Uma comparação antiga do teste de desligamento usava contador anterior à captura de tela; agora ele é registrado atomicamente no mesmo instante do desligamento. Capturas ampliadas, prévias1366/393 e quatro cortes reais foram inspecionados; evidências ficam ignoradas em `docs/evidence-paper-doll/` e no artefato de CI, sem versionar imagens em massa.

## Limites

O protótipo do Espadachim tem cobertura funcional Idle/Walk/Attack nas quatro direções e passou no ensaio de combate. **A arte continua em revisão (`approved:false`) e não foi ativada no catálogo de produção.** Coerência fina de cabelo/roupa e transições entre os lotes ainda fazem parte da aprovação do personagem completo. Não se declara o sistema inteiro concluído nem os28 perfis equipados com novas animações de combate.

Faltam as cinco outras categorias de ataque (160 frames por camada,480 anatômicos/vestuário, mais armas/encaixes), habilidades específicas, variantes de peças e o customizador persistente. Novos gestos compatíveis devem ser compartilhados; o número de frames é um levantamento de cobertura, não um orçamento nem uma obrigação de gerar cópias por classe/facção. Equipamentos não contemplados e ações sem peças seguem no fallback. Nenhuma regra de combate, mapa, save ou progressão foi alterada.

Para o colaborador: acrescentamos o primeiro corte básico modular compartilhado em quatro vistas, giros exatos da arma e sua edição/exportação na bancada. Os assets anteriores e o gameplay ficam preservados; o lote continua como inspeção, sem merge automático.
