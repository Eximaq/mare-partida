# Remoção confirmada — primeira HUD de personagem

Base auditada: `903ec11` (PR #226 integrado). São imagens da primeira integração do cartaz, substituídas pela HUD HD. Não há referência direta nem construção dinâmica desses caminhos no runtime; o único catálogo de origem era o manifesto local, agora com registros de retirada e hashes preservados. `character-hud.js` seleciona emblemas e placas atuais; `ui-hud.css`, `ui-tokens.css`, `index.html` e `ui-preview.html` usam `hd/status.png`, `hd/poster.png`, materiais HD e medidores CSS. Nenhum importador ou teste atual lê os sete arquivos.

| Caminho removido | Bytes | Substituição atual |
|---|---:|---|
| `assets/ui/character-hud/bounty.png` | 1077 | HUD em `assets/ui/character-hud/hd/` e medidores dinâmicos |
| `assets/ui/character-hud/energy.png` | 1523 | HUD em `assets/ui/character-hud/hd/` e medidores dinâmicos |
| `assets/ui/character-hud/hp.png` | 1339 | HUD em `assets/ui/character-hud/hd/` e medidores dinâmicos |
| `assets/ui/character-hud/portrait.png` | 3247 | HUD em `assets/ui/character-hud/hd/` e medidores dinâmicos |
| `assets/ui/character-hud/poster.png` | 52662 | HUD em `assets/ui/character-hud/hd/` e medidores dinâmicos |
| `assets/ui/character-hud/ribbon.png` | 910 | HUD em `assets/ui/character-hud/hd/` e medidores dinâmicos |
| `assets/ui/character-hud/status.png` | 16698 | HUD em `assets/ui/character-hud/hd/` e medidores dinâmicos |

Total: 77456 bytes. A fonte Alabasta Pirate, a proveniência, as artes HD, os emblemas e as 32 insígnias permanecem. A remoção é recuperável pelo histórico normal do commit; não exige migração de saves.
