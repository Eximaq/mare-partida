# Espada 0 / Peitoral 151: integração opcional para revisão

Escopo único: feminina, Espada 0 e Peitoral 151, pele original, cabelo cropped loiro, olhos âmbar, sem outro slot visual incompatível. Reaproveita 120 registros das quatro direções que já estão arquivados no PR. O jogo só usa a candidata se nenhuma rota exata ou em camadas existente resolver aquele quadro. Para este recorte, a versão atual guarda 24 rotas antigas de calças e a candidata cobre os 96 slots isolados restantes. Controle sem trocar peça preservado. Pedido de peça desconhecida não aceita fallback silencioso. Não adiciona nova arte, não ativa por padrão, não altera relógio do combate. A integração não afirma que as outras 5 espadas, outras aparências, armas ou visuais completos estejam cobertos.

Teste em uma cópia integral do PR (que já contém o acervo):

1. `python tools/build_pages.py --include-sword-checkpoint`: valida SHA das partes e arquivo, exporta os 1.503 PNGs conferindo cada SHA e deduplica os estados da arma no catálogo emitido.
2. `node tests/rework-sword0-checkpoint-optin.cjs .`: teste do renderizador Native com build emitido; verifica 96 slots novos, 24 rotas anteriores idênticas, 96 quadros Canvas e 161 imagens carregadas. Não usa Node crypto no caminho de seleção; a inicialização UMD verifica quatro fontes em WebCrypto, e a seleção compara o JSON previamente autenticado. Uma guarda inválida desativa toda a candidata.
3. Servir o `dist` em contexto seguro e abrir `/?reviewSwordCheckpoint=1`. A rota sem query continua intacta. Build normal, sem a flag, não contém o JS, catálogo nem os PNGs de revisão.
4. Validar no navegador antes de ativar uma entrega: abrir aparência alvo, trocar/retirar cada tipo de equipamento e testar combinações. Chromium do executor não abriu devido à restrição de socket; não declarar navegador confirmado a partir do smoke Canvas.

Nenhum ZIP ou PNG novo deve entrar no Git. `dist` é saída temporária.
