# Correção estrutural da bancada96 — v10

30/10/2026. Branch `fix/paper-doll-structural-occlusion`, checkpoint `ed03bdf` da continuação do PR#144. Produção permanece desativada. Esta revisão responde às imagens e ao texto único enviado pelo proprietário; as cópias repetidas do texto não formam tarefas adicionais.

## Diagnóstico confirmado

| Causa | Evidência | Correção compartilhada |
| --- | --- | --- |
| Restauração incondicional de mãos depois da capa | Mãos e luvas desenhadas sobre tecido opaco em North | A última passagem dos membros respeita o alpha da capa em North. Pixels expostos permanecem visíveis. Cabeça continua acima da gola; South e laterais mantêm sua ordenação própria. |
| Profundidade lateral inferida do z do estimador | Nos quadros defeituosos os dois braços eram próximos; a pele do braço distante abria a camisa | Câmera canônica: RIGHT próximo e LEFT distante em East; West deriva da composição inteira por FlipX. Importar novas medições não pode substituir essa profundidade por dois zeros. |
| NECK copiado de um ombro | Feminino South: espada3/7 e canalização5, erro de aproximadamente10px | Detector compara pescoço ao centro dos ombros, recusa referências ambíguas e reconstitui somente as referências comprovadamente trocadas. Cabeça, rosto e cabelo recebem a mesma translação inteira. |
| Antebraços já pintados sobre as costas no corpo nativo | Disparo masculino North exibia braços cruzados sobre o dorso mesmo sem itens | Superfície dorsal da matriz North atual restaura a região que deve ocultar os braços direcionados para longe da câmera. Profundidade North e máscaras anatômicas passam a respeitar esse oclusor também sem capa. |
| Molde reutilizável ainda descrevia mãos acima de toda capa | handPriority e contatos estáticos não refletiam a nova regra | fit-template usa os contatos atuais, registra profundidade por direção, ordem da consolidação e o oitavo molde na galeria. |

Os testes antigos de palmas privilegiavam sua visibilidade incondicional e não detectavam a oclusão incorreta. A auditoria agora distingue palmas expostas, braços escondidos pelo tronco, membros passando à frente do ombro e mãos escondidas pela capa.

## Escopo do reparo

- 64 arquivos primários:57 mantidos byte a byte; sete folhas North tiveram22 quadros reparados exclusivamente dentro da superfície dorsal.8.482 pixels de cor mudaram; zero mudanças de alpha ou pixels fora dessa região. Nenhuma silhueta de membro foi apagada para esconder falhas.
- Matriz dorsal usada como underpaint é a referência96 atual, sem substituição pelo personagem84 antigo. Proporções, pernas, pés, durações, contagem de frames e pivôs permanecem iguais.
- Os três contatos de cabeça femininos foram corrigidos nos dados, nos sockets e nas três camadas já consolidadas. Os outros quadros desses arquivos mantêm seus pixels.
- As máscaras anatômicas, as camadas dependentes de braços/roupa-base e os dois Torso foram reconsolidados. Não há offsets individuais por cabelo ou por equipamento.
- Capacete continua ocultando cabelo; feições ficam abaixo dele e do cabelo. Paletas de pele e roupa continuam independentes. Tecnologia continua compartilhando disparo.
- A capa não é colocada acima de tudo em todas as direções: em North cobre o dorso e os membros realmente atrás dela; em outras vistas o tecido posterior precede o corpo, a gola tem sua passagem e o braço próximo permanece à frente.

## Arquivos e rotina reutilizável

- tools/paper-doll-96-v3/wardrobe.js: composição final e visibilidade das mãos/luvas pela capa.
- tools/paper-doll-96-v3/torso.js: superfície dorsal e propriedade das áreas anatômicas.
- tools/paper_doll_96_repair_rig.cjs: validação dos pescoços, profundidade de câmera, reparação dorsal com pixels nativos. Exige bancada isolada.
- tools/paper_doll_96_bake_ownership.cjs: máscaras e camadas dependentes; importação mantém a profundidade canônica.
- appearance-rig.json, manifest.json, appearance-catalog.json e fit-template.json na bancada: contatos, sockets, proveniência e regras atualizadas.
- assets/ da bancada: sete corpos North, três famílias de cabeça femininas afetadas, camadas dependentes, máscaras, Torso e molde estático. Nomes existentes preservados.
- tests/paper-doll-96-structural.test.cjs e tests/paper_doll_96_structural_browser.cjs: regressões novas. A auditoria de propriedade foi ampliada.

Sequência para reutilizar a base, sem chamada paga:

```text
node tools/paper_doll_96_repair_rig.cjs
node tools/paper_doll_96_bake_ownership.cjs
node tools/paper_doll_96_bake_torso_browser.cjs http://127.0.0.1:PORTA/
python tools/build_pages.py
```

O servidor deve apontar para a raiz do repositório. A consolidação anatômica também atualiza automaticamente o molde estático de Torso e copia os contatos atuais para fit-template, evitando um guia antigo após nova importação. Os construtores de PNG requerem Sharp; os de navegador requerem Playwright/Chromium. O molde do Torso e os contatos publicados devem acompanhar a revisão das máscaras. Uma nova peça não recebe aprovação automática por reutilizar o molde: conferir vistas, todos os quadros e combinações relevantes.

## Testes executados

| Verificação | Resultado |
| --- | --- |
| Suíte Node autônoma |159 aprovados; arquivos locais não relacionados e E2E externo excluídos conforme fluxo existente |
| Contratos estruturais |480 poses de entrada,1.440 relações de profundidade e três referências de cabeça verificadas |
| Auditoria nova em Chromium, fonte e Pages |1.908 combinações North,2.682.648 pixels internos de capa,172.188 pixels expostos,99.570 pixels centrais de costas com/sem luvas,1.260 testemunhas do peitoral lateral e769 pixels de palmas distantes expostas: zero violações |
| Contraprova sobre o checkpoint v9 | Falhou como esperado:304.620 violações de capa,1.152 testemunhas de abdômen, três referências de cabeça e20 relações de profundidade. Confirma que a auditoria encontra os defeitos anteriores |
| Auditoria de propriedade |6.360 conjuntos:89.220 pixels de palma,167.262 de antebraço e32.592 de ombro verificados;48.438 provas estavam ocultas pela capa e foram classificadas como tal. Zero violações |
| Torso/pele/capacete |848 encaixes,192 casos de pele,424 casos de cabelo sob elmo e133.232 pixels de braço visível: zero violações |
| Encaixe geral |424 poses,224 matrizes,3.392 lados de pares,848 calças,2.544 rostos,4.240 cabelos e112 estados da UI: zero violações nos critérios medidos |
| Preservação direta do checkpoint |618 composições South idênticas:318 masculinas e300 femininas, excluindo apenas as três poses femininas intencionalmente corrigidas |
| Aparência completa |44.840 combinações:11.872 modelos/poses,27.136 conjuntos e5.832 combinações com slots vazios; ambos os corpos aprovados |
| Espelhamento |64 materiais,842 quadros-fonte e3.286 composições exatas |
| Biblioteca de movimentos |480 quadros de entrada, oito referências estáticas preservadas, caches limitados, sem save criado |
| Limpeza nativa |424 poses, sem resíduos detectados |
| Repetibilidade | Nova execução do reparador não produz reparos adicionais; consolidação repetida preservou926 PNGs byte a byte, inclusive na checagem final com atualização automática do molde |
| Build/empacotamento | Pages construído e quatro testes Python aprovados |

A verificação adicional das mãos distantes expostas confirma que o plano distante não dispensa a cobertura das luvas:769 pixels conferidos sem pele descoberta pela luva fechada. As contagens descrevem detectores específicos; não equivalem a ausência de todo defeito artístico possível.

## Inspeção visual

Foram inspecionados quadros completos de Idle, Walk e dos cinco ataques distintos de ambos os corpos, com prioridade para todas as vistas North, ataques South femininos e perfis East/West. Também foram revisadas vistas dorsais sem capa, para não esconder o defeito com equipamento.

A comparação antes/depois apresenta capa North, peitoral West, dorso masculino no disparo, cabeça feminina na espada/canalização e luvas femininas. Prévia animada preserva a escala de pixels e usa tempos variáveis para mostrar todos os quadros sem pular poses; a repetição com pausa serve à revisão. Capturas recentes da bancada em1920×1080,1366×768 e1280×720 foram guardadas fora do repositório, junto aos recibos e ao checkpoint. A bancada exibe o personagem sobre o cenário do lobby; a aventura publicada continua usando sua integração existente.

## Galeria e custo

Jade Dragon:84 folhas existentes atualizadas, incluindo o molde do Torso, sem novos IDs.235 folhas consolidadas continuam registradas. Foram85 salvamentos gratuitos, incluindo uma repetição de confirmação do molde; zero gerações pagas nesta revisão. Não confundir essas operações com os custos históricos v7–v9, que permanecem documentados. Os hashes e IDs da revisão estão em appearanceV10Updates; recibos de restauração permanecem privados.

## Compatibilidade, pendências e reversão

A bancada não altera saves, slots, IDs de itens, atributos ou persistência da aventura. Continua productionEnabled:false. Arte, equipamentos e animações do sul masculino válidos devem permanecer preservados; a comparação direta com o checkpoint faz parte da entrega.

Não foram criados novos modelos de armas nem efeitos nesta correção. As animações de espada/adagas/disparo/tecnologia/canalização usam o conteúdo que já existe na biblioteca; esta validação não afirma cobertura de armas futuras nem de todas as combinações que ainda não existem. Aprovação artística e ativação no personagem publicado permanecem pendentes do proprietário.

Para desfazer, reverter somente os commits desta revisão sobre ed03bdf, reconstruir Pages e restaurar na galeria as folhas anteriores pelos recibos/checkpoint. Não reverter trabalhos de colaboradores nem reescrever main. Próxima etapa mínima: revisão visual do proprietário no lobby antes de qualquer integração na aventura.
