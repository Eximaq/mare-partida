# HUD HD — auditoria e contrato visual

Branch: feature/pirate-hud-hierarchy-hd. Base auditada: 1572627.

## Diagnóstico confirmado

- O cartaz copia o canvas de 72 × 72 do retrato antigo, incluindo cenário e aura. A correção usará o compositor native96 diretamente num canvas transparente próprio.
- status.png tem 361 × 181, mas seu contêiner usa 361/166; poster.png tem 357 × 502, mas é recortado num contêiner 357/420. Não reutilizar essas proporções divergentes.
- A faixa superior duplica nome e retrato. Removê-la, mantendo os acessos existentes por controles já presentes.
- Os quatro emblemas oficiais possuem 912 × 912; reutilizar assets/ui/faction-emblems sem geração nem redesenho.
- O nome usa a fonte original Alabasta Pirate. A Bounty ficará vazia, substituindo o requisito histórico de zero.

## Fonte única de hierarquia

MareHierarchy.titles e MareHierarchy.title são a fonte da grafia. O par factionId/hierarchyTier identifica o título; as chaves abaixo são apenas notação documental, não novos IDs persistidos. A promoção existente usa MareHierarchy.next e server/hierarchy.py. Patamares 6–8 estão declarados, mas bloqueados; a migração atual limita saves a 1–5. Nenhuma regra será alterada.

| Chave (facção:patamar) | Nome exato | Atribuição atual | Família visual prevista | Estado |
|---|---|---|---|---|
| pirate:1 | Pirata Novato | Inicial | pirate-base | Planejado |
| pirate:2 | Pirata Promissor | Promoção manual, nível 20 | pirate-base | Planejado |
| pirate:3 | Capitão Pirata | Promoção manual, nível 50 | pirate-base | Planejado |
| pirate:4 | Supernova | Promoção manual, nível 75 | pirate-command | Planejado |
| pirate:5 | Shichibukai | Promoção manual, nível 100 | pirate-command | Planejado |
| pirate:6 | Comandante Yonkou | Bloqueado; nível declarado 135 não libera promoção | pirate-elite | Planejado |
| pirate:7 | Yonkou (Imperador) | Bloqueado; nível declarado 170 não libera promoção | pirate-elite | Planejado |
| pirate:8 | Rei dos Piratas | Bloqueado; nível declarado 200 não libera promoção | pirate-elite | Planejado |
| marine:1 | Recruta | Inicial | marine-base | Planejado |
| marine:2 | Marinheiro | Promoção manual, nível 20 | marine-base | Planejado |
| marine:3 | Sargento | Promoção manual, nível 50 | marine-base | Planejado |
| marine:4 | Capitão | Promoção manual, nível 75 | marine-command | Planejado |
| marine:5 | Comodoro | Promoção manual, nível 100 | marine-command | Planejado |
| marine:6 | Vice-Almirante | Bloqueado; nível declarado 135 não libera promoção | marine-elite | Planejado |
| marine:7 | Almirante | Bloqueado; nível declarado 170 não libera promoção | marine-elite | Planejado |
| marine:8 | Almirante de Frota | Bloqueado; nível declarado 200 não libera promoção | marine-elite | Planejado |
| revolutionary:1 | Simpatizante | Inicial | revolutionary-base | Planejado |
| revolutionary:2 | Guerrilheiro | Promoção manual, nível 20 | revolutionary-base | Planejado |
| revolutionary:3 | Oficial Revolucionário | Promoção manual, nível 50 | revolutionary-base | Planejado |
| revolutionary:4 | Executivo | Promoção manual, nível 75 | revolutionary-command | Planejado |
| revolutionary:5 | Comandante de Tropa | Promoção manual, nível 100 | revolutionary-command | Planejado |
| revolutionary:6 | Comandante de Exército | Bloqueado; nível declarado 135 não libera promoção | revolutionary-elite | Planejado |
| revolutionary:7 | Chefe de Gabinete | Bloqueado; nível declarado 170 não libera promoção | revolutionary-elite | Planejado |
| revolutionary:8 | Líder Supremo | Bloqueado; nível declarado 200 não libera promoção | revolutionary-elite | Planejado |
| government:1 | Agente Menor | Inicial | government-base | Planejado |
| government:2 | Agente Oficial | Promoção manual, nível 20 | government-base | Planejado |
| government:3 | Inspetor do Governo | Promoção manual, nível 50 | government-base | Planejado |
| government:4 | Agente Cipher Pol | Promoção manual, nível 75 | government-command | Planejado |
| government:5 | Elite Cipher Pol (CP9) | Promoção manual, nível 100 | government-command | Planejado |
| government:6 | Agente Aegis (CP0) | Bloqueado; nível declarado 135 não libera promoção | government-elite | Planejado |
| government:7 | Comandante Aegis Zero | Bloqueado; nível declarado 170 não libera promoção | government-elite | Planejado |
| government:8 | Diretor Geral | Bloqueado; nível declarado 200 não libera promoção | government-elite | Planejado |

## Direção visual

Madeira #302018, ouro #c69849, pergaminho #e3be7c; títulos vermelho #8f2535, verde #215b42, azul #235480 e marfim #eee4cc. Alabasta Pirate no nome; tipografia existente legível nos valores e títulos dinâmicos. Painel 300 px, arte em resolução superior, sem deformar ornamentos; título à esquerda do emblema e imediatamente acima do HP. Cartaz com proporção integral da arte e retrato native96 sem fundos.

## Validação planejada

32 títulos, quatro emblemas, mudança real de título, reload, barras 0/25/100%, nomes longos, transparência do retrato, ambos os corpos, capacete oculto/visível, resoluções desktop/mobile e regressões Node. Capturas reais fora do repositório. Cada etapa será registrada apenas após execução.
