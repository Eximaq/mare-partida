# Hierarquia dos Mares

Quatro facções usam oito patamares com requisitos nos níveis 1, 20, 50, 75, 100, 135, 170 e 200. Os títulos ficam em `hierarchy-system.js` e `server/hierarchy.py`. A promoção é sempre para o patamar seguinte. Os patamares 6–8 permanecem indisponíveis, inclusive quando o requisito de nível é alcançado, com a mensagem sobre itens especiais ainda não descobertos.

O menu **Personagem → Hierarquia dos Mares** mostra símbolo, cargo, progresso até o próximo nível, as artes oficiais de cada cargo e o Top 10 da própria facção. A confirmação apresenta o cargo anterior e o seguinte. As artes enviadas pelo proprietário foram recortadas por célula, com o fundo removido mecanicamente e sem regenerar a tipografia ou os símbolos. Os arquivos públicos estão em `assets/ui/hierarchy/`.

No preview com `python server/app.py`, o navegador sincroniza ID, nome, facção, nível e poder em `POST /api/hierarchy/sync`. O servidor persiste o patamar e o título em SQLite, valida `POST /api/hierarchy/promote` e devolve `GET /api/hierarchy/state?player_id=...`. A consulta do ranking usa `faction` do jogador consultado e ordena por patamar, nível e poder em ordem decrescente, com ID como desempate final estável.

O preview do GitHub Pages não executa Python. Nesse ambiente, o cargo fica no save local e o painel identifica o ranking como preview local, com apenas o jogador atual. O servidor existente ainda é uma demonstração em loopback sem autenticação ou autoridade sobre XP e poder; antes de usar esse ranking em multiplayer, nível, poder e identidade precisam ser calculados e validados pelo servidor de contas.
