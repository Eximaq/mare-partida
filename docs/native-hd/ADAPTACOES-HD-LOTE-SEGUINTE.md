# Adaptações seguintes, agrupadas no PR #348

Base: `58d0ed0`. O PR #349 trata somente da entrega das seis espadas que já está nos testes do GitHub. Não foi alterado por este lote.

## O que foi validado

- **Espadas femininas 0/1/67/68/69/70:** o visual de referência de cabelo curto loiro e olhos âmbar agora mantém os oito tons do save. O adaptador aceita um tom novo apenas quando a fonte do corpo, os oito estados de ataque e o material de cabelo/íris coincidem com o contrato validado. Conferidos 192 pedidos de seleção (6 × 4 × 8) e 384 quadros de pôr/tirar a Bota 9, usando Porcelana e Ébano. Nenhum pixel mudou fora da bota e os estados da arma ficaram iguais. Não altera outras aparências.
- **Luvas nas seis espadas femininas:** G145/G166/G173 habilitadas também nos tons do save. O registro confere a assinatura dos quadros de cada direção. Inspeção de 192 PNGs e comparativos por alfa de mão/luva não encontraram tinta de pele nessas camadas. G180 não foi incluída, pois a propriedade dos pixels ainda não está estabelecida.
- **Soco masculino Sul:** 18 novas combinações no visual padrão (Luvas 26/159 e nove botas estáticas), com 144 quadros na cor padrão e 32 com dois contrastes. Máscara de 45 pixels isolada para a íris, preservando o rosto e a pele; nenhuma promoção de B9/sem bota e nenhuma substituição da rota HD exata.

- **Caminhada feminina Sul, Calça 168:** aceita Botas 9 e 176 sem exigir o Peitoral 151, com ou sem a Luva 152. Verificados os 40 quadros de cada configuração, com os tons Porcelana e Ébano. A troca não altera a sola nem os pixels fora da bota. A Bota 155 manteve a referência histórica.

- **Armas 113/114 femininas no Norte, sem outras peças:** o perfil salvo passa a preservar o recuo original da cabeça/cabelo, de 9 pixels no quadro 4. Comparados 16 quadros Originais idênticos e 32 quadros com aparência salva, sem tocar nos estados da arma nem no relógio.

## O que não foi forçado

- Calça 147 ou 182 com Bota 9 ou 176, caminhada feminina Sul: trocar a ordem de desenho não elimina a área contínua que reage ao tom de pele na barra. A arte e o pivô continuam intactos.
- **Adagas femininas 12/13/71/72/73/74:** 24 controles de origem válidos, 720 encaixes no seletor do acervo e 96 quadros amostrados em Canvas. As quatro camadas da cabeça transladam juntas sem redesenho. O perfil do save real não é igual ao Original literal do acervo. A pele e a camiseta compartilham 32 quadros de corpo e a máscara de cor genérica invadiria o tecido. Nenhuma dessas rotas foi ativada.
- **Armas de fogo 113/114 femininas:** fontes verificadas e arquivo preservado. A W114 Norte/Sul do acervo tem um relógio diferente do jogo (30 ticks a 24fps frente a 8 a 12fps). A revisão W113 Norte do acervo não tem os mesmos estados de arma. A correção do recuo usa estados nativos, sem habilitar as roupas editáveis ou capas do checkpoint.
