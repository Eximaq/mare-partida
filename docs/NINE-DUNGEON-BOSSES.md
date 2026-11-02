# Nove chefes reais — Quest Dungeons

Atualização de 02/11/2026. Branch: feature/nine-dungeon-bosses. Base inicial: 8362794 (PR #205). Integração posterior: fa2b0ce, incluindo PRs #204 e #206.

## Origem e registros

Os nove personagens foram encontrados no MCP da conta atual do proprietário. Nenhuma geração foi necessária e nenhum crédito foi consumido. A conexão carregada anteriormente pela sessão apontava para outra conta; a consulta e os downloads desta sprint utilizaram a configuração MCP atual, sem guardar credenciais no projeto.

Walking e Attack existem nas quatro direções. Hurt usa South nativo como no adaptador atual; Buggy também dispõe de North nativo. Não há espelhamento de armas. O empacotador conserva cada pixel RGBA, acrescentando apenas margem transparente para os atlas quadrados. Hashes dos frames, dimensões, pivôs e nomes originais estão nos metadata.json; hashes dos exports e retratos estão em assets/sprites-combat-v2/dungeon-boss-provenance.json. Os sete retratos enviados foram copiados sem recompressão; Alvida e Morgan reutilizam as ilustrações HD já aprovadas. As fontes são assets fornecidos pelo proprietário; não se declara uma licença comercial adicional.

| Masmorra / tipo de combate | Nv. | ID PixelLab | Altura visual |
| --- | ---: | --- | ---: |
| alvida / dungeon-alvida | 10 | efe38a49-b281-47eb-8c09-30d425d03291 | 84 |
| morgan / dungeon-morgan | 20 | dfe782a0-01a4-45f3-8c65-bbe16abc5830 | 114 |
| buggy / dungeon-buggy | 30 | 1b32c37b-8aa6-4139-b948-f832eadd55f6 | 108 |
| kuro / dungeon-kuro | 40 | ad4bc800-098b-4065-8017-ec46c784fc7d | 102 |
| krieg / dungeon-krieg | 50 | 19bcb138-d9d4-432c-aa53-fb384db28bd4 | 116 |
| arlong / dungeon-arlong | 60 | ceb733b5-99c9-4c84-ab66-7f673c6d0c93 | 120 |
| smoker / dungeon-smoker | 70 | b262f653-ac04-4988-93ac-8b4b29886fa8 | 112 |
| wapol / dungeon-wapol | 80 | f208acb0-982c-4d65-9567-39c27e7f43e7 | 116 |
| crocodile / dungeon-crocodile | 90 | bac38f19-0860-44ac-ae07-7e81e9f541aa | 114 |

As alturas são independentes dos atributos. Na revisão do proprietário, Alvida permanece menor que o personagem de 96 px; os demais foram reduzidos e permanecem um pouco maiores. Escala final: 84/114/108/102/116/120/112/116/114, respectivamente.

## Atributos

tools/update_dungeon_profiles.cjs executa a função oficial MareHunt.profile em um processo Node isolado, usando bandit no nível fixo de cada chefe, e registra os resultados no catálogo. Nenhuma fórmula é duplicada e hunt-system.js permanece idêntico à main para preservar a assinatura dos combates autoritativos. Os testes recalculam esses valores pela função oficial. combatProfile usa essa referência comum, multiplica HP/ATQ/DEF/defesa mágica por 2,5 uma vez e arredonda com Math.round. Defesa mágica comum usa a defesa física como referência, conforme o fallback existente. A referência não define ataque elemental separado; nenhum valor novo foi inventado.

| Chefe | Nv. | HP normal → chefe | ATQ normal → chefe | DEF física/mágica normal → chefe |
| --- | ---: | --- | --- | --- |
| Alvida | 10 | 392 → 980 | 28 → 70 | 14 → 35 |
| Morgan | 20 | 867 → 2168 | 50 → 125 | 25 → 63 |
| Buggy | 30 | 1496 → 3740 | 72 → 180 | 37 → 93 |
| Kuro | 40 | 2280 → 5700 | 94 → 235 | 48 → 120 |
| Don Krieg | 50 | 3218 → 8045 | 116 → 290 | 59 → 148 |
| Arlong | 60 | 4309 → 10773 | 138 → 345 | 71 → 178 |
| Smoker | 70 | 5555 → 13888 | 160 → 400 | 83 → 208 |
| Wapol | 80 | 6954 → 17385 | 182 → 455 | 94 → 235 |
| Crocodile | 90 | 8508 → 21270 | 204 → 510 | 105 → 263 |

Movimento 50, intervalo 2,1 s e alcance 51 continuam os da referência comum. Não recebem 2,5×. XP e ouro de abate são zero: a concessão continua exclusivamente no baú, pelo subsistema transacional existente.

## Combate, mapa e carregamento

- Nove tipos próprios dungeon-* registrados no controlador; os substitutos mr3/cocox foram retirados deste modo.
- Walking acompanha deslocamento/pathfinding e direção do alvo. Attack bloqueia o deslocamento durante a execução e emite um único evento no frame de contato inspecionado. Delta longo, alvo fora do alcance, morte, perda de linha de visão e interrupção não geram hits extras. Reação Hurt continua no adaptador compartilhado, sem um renderizador paralelo.
- Frames de impacto por direção estão no manifesto e no importador. North de Alvida/Morgan/Arlong foi revisado individualmente, sem pressupor o mesmo frame de South.
- A derrota usa a finalização já existente: remove a entidade e grava a vitória antes de liberar o baú. Não há animação de morte inventada.
- Quest Dungeons original intacto: jogador (928,1440), chefe (928,672), baú exportado (802,-168), normalizado para a interação já validada. Tile/colliders/câmera/profundidade não foram redesenhados. A agressividade da instância usa a mesma regra já empregada em Impel, evitando retorno indevido ao spawn.
- Abrir a HUD não baixa os atlas de combate. Entrar aguarda somente os atlas do chefe selecionado, reutiliza o cache e valida dimensões; falha informa o carregamento e não inicia a tentativa nem desenha um monstro antigo. Nova tentativa pode repetir um download que falhou.
- O build versiona os dois novos scripts e inclui os novos dados/PNGs no hash do adaptador de sprites.

## Persistência e recompensas

IDs alvida/morgan e versão de save 1 preservados; novos IDs não renumeram os antigos. Tentativa, inimigo e proprietário continuam validados. Reentrar após vitória recupera a instância sem outro chefe e sem depender do download de suas animações. Falhar ou sair antes de vencer permite nova tentativa.

Alvida e Morgan continuam concedendo cinco fragmentos E vinculados, XP pela regra existente e Berry calculado sobre o histórico ao iniciar a tentativa. A receita de dez fragmentos E não mudou. Buggy a Crocodile registram a vitória pendente com recompensa nula: não concedem fragmentos, XP, Berry ou conclusão recompensada fictícia. A HUD informa “Recompensas em definição”; o baú permanece sem concessão até a configuração futura. O estado pendente e a vitória são preservados após reload.

Smoker/Crocodile possuem família temática Logia no catálogo. Não havia proteção natural numérica de inimigo configurada para esses personagens na base atual. naturalProtection permanece null; não se inventou imunidade ou percentual nem se alterou a penetração/defesa/Haki. A definição dessa proteção é pendência de balanceamento.

## Validação

- Auditoria Python: 161/161 testes aprovados; 8.206 frames nativos conferidos por hash RGBA em 35 personagens, incluindo os nove chefes. O teste aceita os dois formatos de proveniência e mantém a conferência dos 26 personagens anteriores.

- npm test na base integrada: 111/111 testes de fundação e 147/147 arquivos Node legados aprovados. npm run build e npm run typecheck aprovados. A regressão de isolamento online foi adaptada para executar e aguardar também a função de entrada agora assíncrona, mantendo a proibição de escrever saves/recompensas.
- Testes de masmorra/combate: atributos, 36 direções/contact frames, evento único, interrupção, nível, migração, recompensas indefinidas, baú, limites/rota nativa e persistência.
- Navegador Chromium 1366×768: nove chefes caminhando/atacando/sofrendo dano, 36 ataques direcionais, morte, resgate indefinido sem concessão, carregamento sob demanda; sem exceções JS ou diagnóstico de recurso faltante. Capturas individuais e animação comparativa ficam fora do Git.
- Regressão existente de masmorras no navegador: dois resgates únicos, dez fragmentos, formação de Akuma E, reload pendente, segunda aba somente leitura e oito painéis compatíveis.
- python tools/build_pages.py: aprovado; rotas relativas e arquivos estáticos preservados. O mesmo teste completo dos nove chefes passou também em dist. Recuperação após download interrompido, tentativa sem mutação em falha e vitória pendente sem atlas foram conferidas no navegador.
- Retratos reancorados pelo topo nos cards e no painel após revisão do proprietário, preservando os rostos nos nove enquadramentos, sem editar ou recomprimir as ilustrações.
- Workflow dungeon-bosses.yml repete os testes de regras e os dois ensaios de navegador no pacote publicado.

## Compatibilidade e pendências

O PR #207 foi mesclado no commit original d0f3fb6 antes da conclusão desta conferência. O enquadramento dos retratos, a compatibilidade com batalhas anteriores do servidor e a atualização do teste de artes seguem no PR corretivo da branch fix/dungeon-server-compat-portraits.

Durante a conferência final em 02/11/2026, os PRs #204 e #206 entraram na main (fa2b0ce). Foram integrados por merge normal, preservando os dois trabalhos. A atualização isolada desta sprint não altera arquivos do servidor ou schemas. Um teste de recuperação reproduziu battle_tick_failed quando a extração da fórmula alterava o hash do motor; preservar hunt-system.js e usar referências geradas pela função oficial eliminou a incompatibilidade. O teste agora confirma pausa e persistência de uma batalha anterior sem perda de HP ou monstros. As guardas ONLINE_GAME das masmorras continuam bloqueando transações locais na sessão online; esta sprint não anuncia masmorras online disponíveis. O contrato online de monstros, dano autoritativo, intenções de habilidades, reload e viewport estreito passou em Chromium com BFF simulado. Um primeiro ensaio com o servidor HTTP Python local perdeu conexões de arquivos; a repetição no servidor estático Node passou. Não houve teste de um novo serviço PostgreSQL/Supabase nesta sprint. Para habilitar estas masmorras online, ainda será necessário portar os nove registros para a autoridade correspondente e repetir os testes dessa sessão.

Pendências: recompensas Nv.30–90, eventual proteção natural Logia, habilidades individuais ainda não especificadas, party e masmorras acima do Nv.90. Não são bloqueios artísticos: os nove chefes possuem os assets atuais integrados.

Rollback: reverter os commits desta branch; não remover nem limpar bossDungeons dos saves. Registros desconhecidos permanecem conservados pela migração.
