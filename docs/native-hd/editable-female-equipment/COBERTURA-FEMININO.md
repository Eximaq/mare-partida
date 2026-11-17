# Cobertura de fontes e animações do feminino

Complemento ao pacote dos 30 equipamentos. Este rascunho compara com o head do PR #331 para que o diff mostre apenas os acréscimos. As fontes históricas foram recuperadas sem alterações de conteúdo do acervo versionado no commit `2801902fa2dad8e83069815faeaa3f53f90bc1b6`. Não alteram seleção, cadência, posição, corpo, personagem ativo, inventário ou publicação.

## Peitorais e movimento: o que está neste rascunho

| Escopo | Situação |
| --- | --- |
| Peitorais 6, 7, 130, 137, 144, 151, 158, 165, 172 e 179 | Os PNGs das 10 peças são editáveis e estão na base do rascunho, em `tools/rework-modular-outfits-hd/archives/female-frozen-torsos-garment-only-v1-part00..05.zip`. As camadas dos peitorais ficam separadas do corpo. O acervo não aprova automaticamente todas as poses de combate desses peitorais. |
| Peitoral 130 | Fontes originais de caminhada S36/N39/EW44 preservadas; não substituir pelos repacotes ou por pose de repouso. |
| Camisa 6 e peitorais 151/158/165/172/179 | Arquivos históricos de caminhada da 6 e pacotes de repouso/correções estáticas preservados nos escopos do acervo; a revisão de punho 158 v13 também consta. Revisão estática não é nova ação. |
| Espadas e adagas | Pacotes editáveis históricos de espadas 0/1/67/68/69/70 e adagas 12/13/71/72/73/74 em Leste/Oeste preservados com seus trajes e tempos originais. Não substituem a versão de espada aprovada posteriormente. |
| Armas de tiro | Fontes de repouso e ataques históricos de tiro dos escopos listados no manifesto, com as próprias chaves, braços e acessórios. Sul, Norte e laterais incluem revisões com cadências diferentes. Nenhuma foi promovida no lugar da versão feminina atual de oito fases. |
| Outros ataques | Pacotes históricos femininos de Manoplas 109/111/112, Braço 117, Orbes 17/122, Pistola 114 e Compasso 16 conservados em suas direções/peças específicas. |

O [inventário de fontes](acervo-feminino.json) contém 22 escopos e 281 arquivos que apontam para os mesmos blobs da versão original, inclusive partes de ZIP e seus manifestos quando o pacote completo é feminino. Fontes de roupa em repouso/caminhada são apenas material editável e não uma ordem para reutilizar todo o corpo em outro ataque.

## Aprovações sem a revisão editável exata recuperada

- Espada feminina da rodada mais recente, incluindo o fio para baixo nas laterais. A prévia de encaixe dos 30 equipamentos é material de revisão, **não** a nova fonte da animação. Não confundir a animação aprovada com os ciclos de teste nem trocar pela edição histórica acima.
- Tiro feminino atual de oito fases (Fuzil 113/peitoral 151): falta a fonte editável com separação comprovada de pele, pernas e roupa. O pacote histórico não resolve essa falta.
- Golas femininas 7/137/144 na caminhada Leste/Oeste, manga do 7 na caminhada Norte e ombros 137/144 no ataque lateral: aprovações específicas existem, mas não foi encontrada a revisão final editável correspondente. Camadas congeladas anteriores não podem ser marcadas como as novas.

Para futura integração, segue o [contrato de precedência](PRECEDENCE.json): a camada nova verificada tem prioridade somente no mesmo corpo, peça, ação, direção e fase; não apague alterações antigas não conflitantes. Nenhuma prioridade foi ativada no jogo neste rascunho.

## Conferência das quatro direções, por ação

| Ação | Norte | Sul | Leste | Oeste |
| --- | --- | --- | --- | --- |
| Caminhada | Arquivos originais 6/130 | Arquivos originais 6/130 | Arquivos originais 6/130; 151 v64 na base | Arquivos originais 6/130; 151 v64 na base |
| Repouso | F151 original | F151/158/172/179 originais; ajustes estáticos adicionais | Fontes separadas dos peitorais na base; não equivale a validar todos os trajes | Fontes separadas dos peitorais na base; não equivale a validar todos os trajes |
| Ataque de espada | Espadas 1/68 históricas em quatro trajes; confirmação editável mais recente pendente | Revisões históricas na base; confirmação editável da aprovação mais recente pendente | Pacotes editáveis históricos; versão mais recente do fio ainda sem editável exato recuperado | Pacotes editáveis históricos; versão mais recente do fio ainda sem editável exato recuperado |
| Ataque de tiro | Fontes antigas de três chaves | Rifles 113/116 históricos | Rifles e mosquetes históricos | Rifles e mosquetes históricos |
| Ataque de adaga | Fonte editável feminina final não certificada neste lote | Fonte editável feminina final não certificada neste lote | Seis IDs, quatro trajes, pacote aprovado | Seis IDs, quatro trajes, pacote aprovado |
| Ataques sem arma, tecnologia e foco | Pacotes pontuais do acervo (117/16), não cobertura geral | Registros da base, sem certificação geral destes ataques | Pacotes pontuais do acervo (109/111/112, orbes), não cobertura geral | Pacotes pontuais do acervo (109/111/112, orbes), não cobertura geral |

Campos com fonte histórica são limitados à revisão indicada. As outras combinações e as revisões mais recentes da caminhada e dos ataques **não** são declaradas fechadas por esta tabela.

O inventário histórico de 113/116 Leste/Oeste prova as vistas e a ordem dos estados, mas não autentica por si só o tempo do ataque atual. O pacote lateral das espadas 1/68 mantém a revisão visual, sem tratar como resolvida a calibração de escala/pivô lógico.
