# DRAWN8 109/17 · integração técnica isolada

**Produção desativada. Nenhum consumidor do jogo carrega este módulo.**
Este pacote substitui o estudo anterior da 109 sobre native96, que é obsoleto.
Não há fallback para aquela base, alteração de inventário, saves, combate ou produção.

## Executar

Na raiz do checkout:

```
node --test tests/rework10917.test.cjs
python tools/rework10917/verify.py
python -m http.server 8000
```

Abrir `/tools/rework10917/` para revisão manual. Python de verificação precisa de Pillow e numpy.
O adaptador canvas tem `prepare(query)` e `draw(ctx, query, {x,y,scale})`.
Só opera com `review:true`, estado inteiro explícito e aparência `approved-source`.
Rejeita outras direções/corpos/aparências; não converte tempo de combate em estados.

## Fontes e equivalência

- Corpo renderizado diretamente de `ataque_punch-drawn8.json` (109) e `ataque_focus-drawn8.json` (17), com cabeça/cabelo/rosto originais. NÃO usar a resegmentação MODULAR8 provisória: vários estados dela divergem visualmente.
- 109: sete estados apresentados, overlays recuperados das receitas aprovadas; máscara corretiva só para diferenças de arredondamento de até 1 nível por canal entre compositores.
- 17: oito estados aprovados; interface autoral mão+orbe copiada exatamente, não é camada pura de equipamento. Frame5 preservado integralmente.
- Manifesto inclui SHA256 dos arquivos aprovados, dos corpos e dos arquivos ZIP de origem. `verify.py` recompõe corpo+equipamento+interface e exige equivalência RGBA exata em 15 estados.
- O adaptador usa o resultado canônico pré-composto para impedir divergências de arredondamento entre navegadores. As camadas e teste de reconstrução são preservados; isso NÃO é modularidade completa.

## Limites / próximos passos

Faltam timeline completa da 109 (retornos não estão entre os sete estados apresentados), ligação aos controladores/consumidores do jogo e QA visual em navegador/jogo. Não inventar mapeamento.
A interface da 17 contém mão/pele aprovada: recoloração exige novo contrato/validação. Não recolorir automaticamente.
Foram localizados backups de roupas/feminino da 109 EAST/WEST e 17/122 EAST/WEST, além de masculino NORTH. Não equivalem a cobertura SOUTH; não habilitar variantes por inferência.
115 permanece fora deste trabalho, com autorização bloqueada. Não há PR, merge ou deploy por este pacote.
