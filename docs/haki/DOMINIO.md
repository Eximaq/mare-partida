# Haki — domínio, ativos e materiais

Acesso à página própria: menu Personagem → Haki. Requer nível 50 e Livro da Vontade. O livro passa a liberar o acesso às árvores; aprender cada ativo exige concluir seu ramo.

## Estrutura e estado

`haki-progression.js` centraliza 16 nós, custos, dependências, graduações, efeitos, versão e materiais. `haki-system.js` permanece o único motor de ativação e Vontade. `haki-ui.js` apenas apresenta os dados e controles; `game.js` confirma/persiste as transações.

- Armamento: Revestimento → Endurecimento → Guarda Reforçada → Imbuimento → Emissão → Domínio do Armamento.
- Observação: Percepção → Antecipação → Leitura de Intenção → Serenidade → Vislumbre do Futuro → Domínio da Observação.
- Conquistador: Presença Dominante → Vontade Inabalável → Pressão do Conquistador → Domínio do Conquistador.
- O desenvolvimento do Conquistador exige **todos** os nós/graduações dos dois ramos iniciais, ou seus marcos de conclusão de versão anterior. Apenas selecionar/injetar visualmente um nó final não abre o portão.
- Estado permanente: `haki.mastery` (versão, sequência, ranks, completedVersions, migração). Estado temporário: `session.haki`. Possuir fragmentos não ativa habilidades.
- Um investimento clona o save, valida sequência/requisitos/custos, consome somente pilhas desbloqueadas do ramo e só retorna o novo estado depois de gravá-lo. Falha de gravação ou confirmação obsoleta preserva tudo.
- Os índices existentes do catálogo são preservados; os três materiais foram anexados ao fim.

## Fragmentos

`haki-fragment-armament`, `haki-fragment-observation` e `haki-fragment-conqueror` são materiais reais, não equipamentos. A quantidade `qty` aparece na mochila/Materiais; pilhas até 99.999; bloqueio impede consumo; não entram em venda, equipamento, fusão ou loot.

Fornecimento de teste somente no laboratório `?dev=1`, com save separado. `haki-fragments` acrescenta 25 por ramo; `haki-mastery-reset` reinicia somente a árvore de teste. Não há distribuição automática.

## Parâmetros preservados

Reserva 100; consumo 5/s; regeneração 5/s em descanso; H/J alternam os contínuos mutuamente exclusivos; a preferência automática é única e dispara no primeiro contato elegível do combate. Esgotamento não religa no mesmo combate. Porto, morte e troca de sessão encerram os efeitos; recarregar não restaura um efeito temporário ligado.

K continua sendo o mesmo Rei/Conquistador: custo 50, recarga persistida 8 s, raio 360 e linha de visão; comuns atordoados por 3 s, chefes com −15% ATQ/DEF por 8 s. A animação cosmética de 0,8 s não determina o alcance de dano/controle.

Armamento completo mantém +15 pp penetração e +10% DEF; Observação completa +15 pp esquiva/precisão, respeitando os limites anteriores. Intermediários têm parcelas provisórias e só fortalecem o ativo aprendido, sem duplicação passiva.

## Logias

A regra existente de `MareRankB.reduction` continua aplicada depois da defesa normal, para as frutas/categorias já reconhecidas. Flags de ataque elegíveis contornam somente essa redução. O caminho ofensivo Ryu consulta `MareHaki.eligibleOffensive`: Armamento aprendido, realmente ativo e com Vontade. Observação, Conquistador, mera posse de fragmentos e Haki desligado não habilitam a exceção.

Isso não remove armadura, resistência mágica, escudos ou invulnerabilidade. A sprint não amplia o escopo da exceção para outras fontes de dano nem inventa PvP.

## Arte e composição

19 ícones Pro 96×96 gerados no PixelLab, com alfa verdadeiro; três spritesheets animadas produzidas/exportadas no PixelLab VFX Workbench. Proveniência em `assets/haki/mastery/provenance.json`; quadros originais e pivôs nos JSONs exportados. Paleta negra/carmesim para os três ramos.

`haki-art.js` carrega apenas três imagens e um manifesto, uma vez por página. Reutiliza dois canvases para recortar o revestimento pelo sprite atual; não altera PNGs do corpo ou arma. Observação não desenha olhos nas costas. Conquistador usa reprodução única limitada a 0,8 s e uma onda vazada; seu tamanho visual não altera colisões/alcance. Sem geração durante gameplay ou uma nova aura a cada atualização.

A página usa a superfície compartilhada de madeira/metal escuro, molduras existentes e fontes do jogo. Mantém rolagem em telas pequenas, seleção de nós, saldos reais, controles aprendidos/ativos distintos e feedback de migração.

## Migração e pendências

Consulte [PENDENCIAS_HAKI.md](PENDENCIAS_HAKI.md). Todos os saves recebem a nova estrutura. O caso antigo já despertado fica sinalizado e protegido até o proprietário definir compensação/Rei. Não há compensação inventada nem árvore gratuita.

Rollback de código: reverter os commits desta sprint. Antes de reutilizar um cliente antigo com um save novo, restaurar a cópia anterior ou exportação compatível; o cliente antigo não conhece os novos materiais/graduações.

## Validação reproduzível

`node tests/haki-progression.test.cjs`
`node tests/haki-system.test.cjs`
`node tests/dev-tools.test.cjs`
`python tests/haki_mastery_art_test.py`
`python tools/build_pages.py`
`python tests/run_honors_hd_browser.py tests/haki_mastery_browser.cjs --offline --dist`

Capturas e saves de teste ficam fora do repositório. O relatório da sprint registra resultados observados e limitações; os testes não autorizam fontes de obtenção.
