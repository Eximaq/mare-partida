# Fase 3 — estado e comandos autoritativos

Início autorizado pelo proprietário em 01/11/2026, após o aceite da Fase 2,
integração do PR #162 e publicação estática no GitHub Pages. Base deste incremento:
main `5b88df6`, que preserva os trabalhos dos colaboradores. O backend segue local;
a publicação do jogo estático não cria uma API pública ou importa saves.

## Etapa 3A implementada — estado persistente somente de leitura

`GET /v1/characters/:id/state` exige sessão BFF de jogo válida e propriedade
verificada pelo backend. Usa o mesmo bloqueio transacional de conta/sessão que
serializa autorização com logout global e recuperação. O identificador da URL é
apenas uma referência; não prova propriedade. Sessão de recuperação não dá acesso.

Resposta estrita: `characterId`, `version`, `level`, `experience`, `gold`.
Version usa `characters.state_version`, já existente; não há segundo contador.
XP e ouro são strings decimais limitadas a BIGINT não negativo, preservando valores
acima do limite exato de Number. Nível começa em 1, XP/ouro em "0". Os limites
técnicos de armazenamento não definem curva de progressão ou balanceamento.

A migração 0003 cria `character_progression`, com chave única por personagem e FK
restritiva. Identidades online existentes recebem somente os valores iniciais;
IDs, nomes, classe, facção, versão, contas e sessões permanecem intactos. Novos
personagens recebem o estado na mesma transação de criação. Falha ao inicializar
faz rollback do personagem. Concorrência/retry não duplica nem reinicia valores.
GET não cria estado ausente: retorna 503; repetir criação também não repara ou
zera silenciosamente progressão ausente.

A role runtime recebe SELECT e INSERT somente na coluna character_id. Defaults
do banco determinam os valores iniciais. Não recebe UPDATE, DELETE nem INSERT
de nível/XP/ouro. Nenhum endpoint aceita alteração desses valores. POST/PUT/PATCH/
DELETE no snapshot retornam 405; parâmetros extras, inclusive accountId/ownerId,
retornam 400. Dono incorreto e personagem inexistente têm a mesma resposta 404;
a resposta não expõe o dono nem credenciais. Cache-Control continua no-store.

## Sequência de implementação

1. **3A (este incremento):** estado inicial, snapshot autorizado, migração e
   testes reais de PostgreSQL. Sem alterações no cliente de gameplay.
2. **3B:** protocolo de comandos com requestId, versão esperada e lease/epoch do
   controlador. Validar sessão, dono e controlador dentro da transação; guardar
   idempotência vinculada a personagem/operação/payload; repetição exata devolve
   resultado anterior e chave com payload diferente é conflito. Não conceder
   valores econômicos arbitrários como primeiro comando.
3. **3C:** escolher uma ação pequena cuja pré-condição e resultado possam ser
   calculados inteiramente pelo servidor. Implementar a mutação com ledger,
   versionamento e rollback; testar concorrência, replay, troca de controlador,
   desconexão, resposta perdida e tentativa de saldo/XP enviado pelo cliente.
4. **3D:** integrar o modo online por funcionalidade, mantendo o modo demonstração
   e seus saves isolados. Inventário, recompensas, RNG e combate exigem contratos
   próprios; nenhum deles está migrado por esta entrega.

Decisões a fechar durante 3B/3C: primeiro comando, retenção de idempotência/ledger,
limite de comandos e reconciliação de cliente desatualizado. Origem pública,
proxy/abuso/carga e backup/restauração continuam requisitos operacionais antes
de expor o backend; não são resolvidos pela publicação estática.

## Validação e operação

TDD: o teste HTTP falhou com 404 antes do endpoint. A regressão de estado ausente
falhou quando um retry de criação o reinicializava; passou ao limitar inicialização
à inserção nova. O teste de valores malformados reproduziu uma exceção na conversão
para BigInt, corrigida por validação sequencial antes da conversão.

Integrações usam PostgreSQL real em bancos UUID descartáveis e provedor simulado,
sem chamadas ao Supabase. Cobrem upgrade 0001/0002, reaplicação, precisão numérica,
invariantes SQL, rollback, duas contas, recuperação, revogação, concorrência de
criação, persistência e grants mínimos. Não substituem as homologações reais da
Fase 2, que permanecem registradas separadamente.

Não aplicar automaticamente 0003 ao banco de homologação existente durante estes
testes. Antes de iniciar essa versão sobre um banco persistente: executar migrações
com a role de migração e reaplicar grant-auth.sql; readiness exige o histórico
completo. Nunca modificar migrações já aplicadas. Auth permanece desligado ao
encerrar, e nenhuma credencial é copiada para o frontend/Pages.
