# Correções pontuais de combate — 04/11/2026

- Nodachi de Kairouseki (68): fio externo corrigido no metadado. Arte, cabo, pivôs, raridade e profundidade dinâmica preservados.
- Paramecia/Logia humanas: ataque desarmado existente, emissão em 0,25 s e recuperação até 0,5 s; a composição oculta apenas a arma, sem desequipar ou adicionar dano básico. Intenções antigas não restauram equipamentos nem concluem conjurações novas. Zoans conservam ações próprias.
- Barra: classe nas teclas 4/5, Akuma em 1/2/3; identidades e recargas independentes. Estados incompatíveis mostram o motivo.
- Caçada: decisão compartilhada a cada 250 ms, uma ação aceita por vez; sobrevivência, proteção, invocação ausente, buff útil e dano alcançável. Consulta entidades e efeitos ativos. Cura considera aliados reais da mesma instância e alcance/visão. Desligar AUTO preserva a ação já confirmada.
- Movimento voluntário bloqueado durante preparação e recuperação. O projétil continua sem reter o personagem após a ação; deslocamentos próprios das habilidades continuam.
- PT: personagens novos começam com zero. A migração local v3 e a SQL 0037 congelam uma única reserva legada, preservando saldo/investimentos. Novos pontos vêm somente de resgates únicos de conquistas. Reset não recria pontos de nível. Atributos, Haki e demais progressões permanecem separados.

A cura manual também considera os aliados conectados da mesma instância. O servidor verifica vida, distância e linha de visão ao aceitar a habilidade e reavalia os destinatários no impacto. A tecla envia apenas o índice da habilidade.

## Implantação

Executar as migrações normais (0037 e 0038) e reaplicar infra/postgres/grant-auth.sql: o papel de execução tem somente leitura da reserva legada. A 0038 promove apenas a assinatura conhecida do combate anterior, preservando o conteúdo salvo e rejeitando assinaturas desconhecidas. Jobs anteriores sem novos campos continuam executáveis uma vez. O servidor exige todas as migrações para ficar pronto; a leitura do esquema histórico permanece disponível para ensaios de migração.

## Verificação

Build do servidor/shared e typecheck; 225 testes foundation; testes direcionados de combate/talentos/party; 1.440 poses e 2.160 contatos de armas; navegador com contexto isolado e capturas reais. Nenhum save ou recurso de jogador utilizado. Preview estático gerado por tools/build_pages.py.

Limitação: PostgreSQL não está instalado neste computador. Os testes de integração SQL foram adequados às novas regras, mas a migração e as permissões ainda precisam rodar no banco isolado da CI/servidor antes do merge. Não foi aplicado SQL no banco do colaborador.
