# Conjunto azul — continuidade vestida (23/10/2026)

O pacote `paper-doll-navy-starter-20261023` reúne corpo, cabelo curto, roupa azul-marinho/linho e espada nas quatro direções: 16 poses Idle, 32 Walk e 32 Attack/sword. Abrir `tools/paper-doll-inspector/index.html?pack=navy-starter`; selecionar **Sequência** para observar a passagem entre ações. As camadas podem ser ocultadas separadamente.

## Reutilização e edição

- Corpo e cabelo: cópias byte a byte do pacote de continuidade de cabelo. O cabelo do ataque continua sendo uma peça direcional presa ao movimento real da cabeça, sem animação secundária própria.
- Roupa Idle/Walk e espada de locomoção: fontes do pacote `walk-profiles`, incluindo os encaixes por frame e a ordem por direção. Nenhuma interpolação, espelhamento ou recriação de poses.
- Roupa Attack: atlas `east-fit`, harmonizado no **PixelLab pixelart_workbench**, edição `01c2c37e-9891-455f-94a5-7ce450f6080e`. Foram alterados exatamente 2.745 pixels de cor, com alfa e silhueta preservados; os tons foram retirados da roupa azul existente.
- A inspeção desse primeiro resultado revelou torso descoberto no ataque leste. A edição Workbench `525c2254-997f-4e3f-9fb5-519cd453b894` aplica polígonos próprios de cada pose ao torso e ombro do corpo original, preservando sua anatomia e transparência. Somente os pixels modificados foram extraídos como roupa; o corpo usado pelo jogo permanece intacto. O primeiro comando foi recusado por nomes de máscara com hífen, sem alteração; a sintaxe foi corrigida para underscores.
- Espada Attack: folha e offsets originais de `east-fit`, inclusive cinco frames norte em que a lâmina está realmente encoberta. O compositor mantém a profundidade original por clip, evitando que a espada de repouso apareça sobre o corpo quando deveria passar atrás.
- Shorts e pés descalços pertencem ao corpo-base. Calças e botas do estudo anterior não foram misturadas a esta roupa, pois não possuem continuidade equivalente de locomoção neste conjunto.

`assemble_review.py` verifica o resultado baixado do PixelLab, extrai a diferença da roupa leste e monta o manifesto. Não pinta nem recolore a arte localmente. `source-audit.json` registra hashes, fontes e contagens; os comandos exatos estão em `changes.json`, `east-clothing-changes.json` e `navy-starter.blueprint.json`. Originais e resultados intermediários são preservados.

Não houve chamada de geração paga nesta etapa. O Workbench se declara gratuito para assinantes; suas respostas não expõem um ledger de consumo de assinatura.

## Validação

- Nove suítes Node Paper Doll: aprovadas, incluindo equipamentos, oclusão, fallback, pivôs e cache.
- Build estático: `python tools/build_pages.py` aprovado, com lista explícita de arquivos públicos.
- Chromium: 240 comparações RGBA independentes (80 poses com todas as peças, sem roupa e sem arma), profundidade e encaixes por pose, sequência Idle → Walk → Attack → Idle, layout de 393 px e isolamento de save.
- Combate real com ativação apenas no contexto descartável do teste: caminhada nas quatro vistas, ataque pelo controlador e evento de impacto existentes, cache limitado, desativação/fallback, Haki e bypass Zoan. O fixture não é distribuído no jogo.
- Inspeção artística: atlas das três ações, correção do torso leste e capturas reais da bancada/combatente. Evidências locais em `docs/evidence-paper-doll/navy-starter/`, fora do Git.

## Limites de entrega

Este é um **candidato completo de quatro camadas para revisão**, não a ativação global do novo personagem. `reviewOnly:true`, `productionEnabled:false`, `approved:false` e a aprovação artística completa continuam separados da cobertura técnica. A troca entre a postura relaxada da locomoção e a base mais aberta do golpe ainda precisa da avaliação do proprietário; não foram inventados frames de transição.

As demais categorias de ataque e roupas alternativas continuam pendentes. Habilidades e personagens de produção mantêm o fallback existente. Não houve mudança de combate, saves, facções, classes, inventário ou equipamentos reais.

## Ensaio jogável no laboratório DEV

A bancada agora oferece **Testar no laboratório DEV**, que abre `?dev=1&paperDollReview=navy-starter`. O mesmo acesso aparece no menu DEV. A prévia carrega somente com ambos os parâmetros, mantém a aprovação artística desativada e usa exclusivamente o save separado do laboratório.

`paper-doll-review.js` carrega e valida o pacote e todas as poses antes de desenhar. O módulo não escreve em armazenamento. O Espadachim pode usar o conjunto nas quatro facções; outras classes, habilidades não cobertas, Zoan, peças desconhecidas ou falhas de carregamento mantêm o renderizador original. Arma inicial (item0) e torso inicial (item6) possuem associação visual; remover retorna ao visual padrão. Botas, perneiras, capas, luvas e capacetes sem camadas também provocam fallback, evitando ocultar equipamento silenciosamente.

O controle de equipamento da bancada foi habilitado com essas mesmas associações. Nenhum PNG foi alterado ou gerado nesta etapa. O botão **Desativar prévia visual** mantém o laboratório com os sprites existentes; **Voltar ao jogo normal** remove os parâmetros DEV e Paper Doll.

Validação desta continuação: dez suítes Node Paper Doll, suíte DEV e build estático. O teste `tests/paper_doll_dev_browser.py` verifica o caminho jogável sem injeção de renderer: equipamento/remoção pelo inventário real, combate, fallback de classe, falha de manifesto, celular e preservação do save normal.
