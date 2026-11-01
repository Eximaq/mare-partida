# Operação do alpha — instalação e aceite da VPS

## Topologia preparada, ainda não implantada

Uma VPS Linux: Nginx HTTPS → Node 24.15 (127.0.0.1:8787) → PostgreSQL 18.6 local.
Frontend `/online/` e `/v1/` na mesma origem; Supabase Auth externo, banco do jogo
separado. Começar com uma instância Node, sem balanceador. Não importar saves.
O proxy sobrescreve `X-Mare-Client-IP`; o Node só aceita esse header do peer exato
configurado. Não confiar em X-Forwarded-For fornecido pelo cliente. O template
pressupõe acesso direto ao Nginx: adicionar CDN exige revisar a cadeia de confiança.

Templates em `infra/hosting/`: systemd, Nginx e exemplo de ambiente sem segredos.
O modo production recusa bind público, proxy ausente, Auth desligado ou sessão
diferente de 24h/2h. A validação Auth também exige origem HTTPS e chave assimétrica.
Não copiar certificado local para a VPS; emitir certificado válido no domínio
autorizado. Não registrar query strings de callbacks, cookies ou corpos de auth.

## Instalação controlada

1. Contratar/criar VPS somente após escolha e autorização. Configurar SSH por chave,
   atualização de SO, firewall: público apenas HTTPS e SSH restrito; PG e API em
   loopback. Reservar disco de dados e espaço de backup; usar usuário `mare` sem root.
2. Instalar Node conforme `.node-version`, PG18 e Nginx do fornecedor confiável.
   Checkout de commit aprovado em `/srv/mare/releases/<commit>`, `npm ci --ignore-scripts`,
   `npm run build`, `python3 tools/build_pages.py`. Não servir a raiz do repositório.
3. Criar roles owner/migrator/runtime com credenciais novas fora do Git; aplicar
   scripts existentes de roles/grants adaptando o nome do banco. Owner não entra
   no ambiente do processo HTTP. Arquivo `/etc/mare/server.env` proprietário root,
   grupo mare, modo 0640. Encriptador persistente deve ter cópia de segurança separada.
4. Parar API, obter backup, migrar com `MIGRATION_DATABASE_URL`, reaplicar grants
   health/auth com owner. Confirmar 13 migrações e readiness. Cada SQL foi versionado;
   não editar migrações já aplicadas.
5. Instalar os templates somente após substituir domínio/certificados; `nginx -t`
   e `systemd-analyze verify` antes de ativar. `/srv/mare/current` aponta à release.
   Node sem root, sistema de arquivos somente leitura, reinício em falha e shutdown
   gracioso. Não expor `/health` ou métricas externamente.
6. Autorizar separadamente URLs de Supabase, SMTP e contas de homologação pública.
   Validar cookie Secure/HttpOnly, CSRF, PKCE, revogação e dois dispositivos na origem
   final antes de convidados. JWT permanece ES256/900s; não reutilizar chaves expostas.

## Backup e recuperação

`tools/backup-local.mts` executa pg_dump custom, sem senha nos argumentos/logs e sem
sobrescrever arquivos. Usar `BACKUP_DATABASE_URL` local, `PG_BIN` do PG18, diretório
privado. Exemplo (ambiente já carregado de arquivo protegido):

```sh
umask 077
node tools/backup-local.mts /var/backups/mare/backup-UTC-unico.dump
```

Para alpha fechado: cópia diária e antes de atualização; meta inicial RPO 24h,
RTO 2h, **metas ainda não comprovadas na VPS**. Encriptar cópia antes de enviá-la a
armazenamento externo autorizado. Reter 7 diárias e 4 semanais após confirmar cópia
externa; não há exclusão automática neste pacote. Banco, arquivo de ambiente e
chave de criptografia precisam de recuperação coordenada. Não arquivar em Git.
Para público/comercial, avaliar backup físico + WAL/PITR para RPO menor.

Restaurar apenas dump confiável em **banco novo e vazio**, sem `--clean`:
`pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname NOVO arquivo`.
Credenciais via arquivo protegido/ambiente. Reaplicar roles/grants com owner.
Conferir migrações, contagens e recibos; testar login novo, saldos, equipamentos,
autorização cruzada e replay. Não restaurar sessões antigas como se fossem válidas:
antes do retorno, revogar sessões restauradas e exigir novo login. Preservar banco
anterior para investigação; trocar destino só após validação. Nunca exercitar desastre
no banco atual para provar o procedimento.

O ensaio automatizado `server-backup.test.mts` exporta e restaura PG real em bancos
UUID descartáveis, compara todas as tabelas e o recibo econômico. Não prova desastre
de disco, retenção externa, tempo de recuperação da VPS ou rotação de chaves.

## Métricas, alertas e carga

API emite janela JSON a cada minuto: requests, erros5xx,429, média/máximo de latência;
sem IPs, contas, URLs ou credenciais. `ops-probe.mts` verifica readiness local,
tamanho do banco, disco livre e fila de revogação. Código de saída 1 se readiness
falhar/demorar ≥1s, disco livre <20% ou revogação mais antiga ≥5min. Timer fornecido;
conectar resultado a canal externo autorizado na instalação (nenhum envio configurado).
Alertar também backup >26h, 5xx >1% em 5min, memória >80%, CPU sustentada >80% e
certificado <14 dias. Limitar journald a 200MB/7 dias; analisar 429 sem remover limites.

Carga local automatizada: 12 personagens independentes, 120 compras/vendas HTTP,
verificação final exata de ouro/itens/ledger. Não mede CCU de VPS nem Supabase real.
Na VPS repetir isoladamente, medir p95/p99, CPU/RAM/IO, pool e rejeições; iniciar
convite limitado e aumentar apenas com margem observada. Não prometer centenas de
jogadores por especificação de plano.

## Gates antes de abrir o backend

- TLS e origem comum validados no host final; IP forjado não contorna rate limit.
- Backup restaurado no host de homologação e cópia externa recuperável.
- Alertas entregues a um responsável; teste de reinício da API e reboot da VPS.
- Carga com margem; políticas de dados/contas e logs estabelecidas.
- Gameplay da demonstração e saves continuam separados; nenhum endpoint aceita saldo.

Fontes: [Nginx proxy headers](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header),
[pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) e
[pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).
