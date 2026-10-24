# Personagem único — ataque de punhos em avaliação

Atualização de 24/10/2026. Este pacote amplia a bancada; não habilita arte provisória no combate normal.

## Resultado verificável

- 24 poses reais: oito de frente, oito para a esquerda e oito para a direita. Corpo e roupa em folhas separadas; cabelo curto nativo da mesma direção acompanha a cabeça estacionária por encaixes medidos.
- A bancada aceita a categoria do pacote, selecionando Lutador/`attack-unarmed` automaticamente. A classe não altera a identidade do corpo.
- Controle individual das camadas, reprodução única, comparação com a referência existente, pivôs e fallback de ações/direções ausentes.
- Build publica somente manifesto e cinco PNGs necessários. Requisições, orçamento e imagens de diagnóstico ficam fora do site.

[Abrir bancada de punhos](../tools/paper-doll-inspector/index.html?pack=punch). O conjunto azul e o editor de aparência continuam disponíveis para ensaios DEV isolados.

## Integridade e limites artísticos

O norte foi gerado, mas reprovado: o braço aparece sobre as costas e não comunica o golpe para longe do observador. Seus oito originais estão preservados, sem roupas geradas nem substituição por poses espelhadas. Na bancada, norte, Idle e Walk desse pacote usam o sprite original completo.

A transferência de roupas também muda pixels de pele no resultado composto. Por isso, o corpo transferido não é usado: apenas as cores nativas da roupa e contornos adjacentes, dentro da região de vestuário inspecionada, são extraídos. `assemble_layers.py` registra limites, hashes e contagem de pixels; o corpo mantém seus pixels originais. Não houve pintura local de anatomia.

Marcas cinza isoladas foram removidas pelo PixelLab Workbench: 16 pixels no leste e 21 no oeste, sem alterar o corpo. Os originais permanecem disponíveis.

O compositor permite peças rígidas de cabelo curto e acessórios, além de armas, com encaixes inteiros por frame. Corpo, calças, botas e roupa continuam exigindo folhas animadas. Somente armas admitem rotações em quartos de volta. Isso não autoriza cabelo longo estático em movimentos que exigem deformação.

Ainda faltam o soco norte correto, luvas/equipamentos, integração do relógio visual de ataques de cada classe e os ataques de arma de fogo, adagas, tecnologia e canalização. Esta entrega **não conclui as sete classes nem aprova artisticamente as novas animações**.

## Custos observados

Teto autorizado: 300 gerações incluindo correções. Acumulado deste lote: **42 gerações confirmadas** — quatro animações de corpo de 3 cada e três transferências de roupa de 10 cada. Nenhum job permanece pendente. O Workbench não expôs cobrança numérica e anuncia edição exata gratuita para assinantes.

## Validação

`tests/paper_doll_punch_browser.py` compara os pixels desenhados no Chromium com a composição nativa das 24 poses, verifica ocultação de camadas, fallback norte, reprodução única, viewport de 393 px e save inalterado. Capturas inspecionadas em desktop/celular ficam localmente em `docs/evidence-paper-doll/punch/`, fora do commit.

Os testes Node de Paper Doll cobrem encaixes, profundidade, rejeição de anatomia rígida, cache, gate DEV, equipamentos, aparência e saves. Executar novamente o build e os testes do editor após integrar a `main` para validar o artefato que será publicado.
