# Plano pendente: gerador em outro computador

Objetivo: medir a interferência do gerador sem mover o banco, expor serviços
à Internet ou usar a instalação privada `7122822`. Este plano não foi
executado. Não requer VPS, contratação, deploy ou Supabase.

```text
PC B: gerador + coletor de recursos
            |
 rede privada + HTTPS validado + mTLS
            |
PC A: gateway exclusivo de teste → API em loopback
                                      |
                            workers + PostgreSQL descartável
                            somente em loopback
```

O runner atual recusa alvos externos e essa proteção será mantida. É
necessário um modo separado de bancada: preparação local no PC A e cliente
HTTP no PC B. Copiar o runner atual para B criaria API e banco no host errado.

## Preparar antes de autorizar a rede

1. Identificar PC B, sistema, recursos, IP na rede privada e proprietário.
   Não pedir credenciais pelo chat. Medir o RTT em janela autorizada.
2. Preparar checkout e cluster descartável no A, isolados do jogo privado.
   Usar apenas contas sintéticas: 50 Solo ou 48 em 12 Parties, sem Supabase.
3. Congelar estado inicial e seed por sala; gerar cópias descartáveis para
   distribuições 6/6, 8/4, 4/8 e 7/5. Registrar hash do snapshot, políticas e
   runtime. Não substituir RNG ou seleção no servidor publicado.
4. Preparar gateway de teste com origem explícita e certificado cujo SAN
   corresponda ao hostname. Validar confiança no B; nunca `--insecure`,
   bypass global TLS ou URL pública. Se uma CA privada for necessária,
   pedir confiança explícita somente no usuário de B. Não distribuir a
   chave privada da CA ou do servidor.
5. Definir porta livre e regra permitindo exclusivamente IP privado de B
   para esse gateway. API e PostgreSQL permanecem em loopback; não reutilizar
   o gateway do jogo. Preparar comandos exatos de inclusão/reversão e guardar
   os identificadores. **Não aplicar firewall, binding, confiança TLS,
   mapeamento de nome ou alteração Radmin sem autorização.**
6. Exigir certificado cliente de teste (mTLS), além da allowlist. Transferir
   material do cliente por canal seguro e usar sessões sintéticas em memória
   ou arquivos ignorados. Nenhum DSN, role de banco, service_role ou segredo
   Supabase vai para B. Preparar a fixture localmente; não criar endpoint
   de seed/admin no servidor normal.
7. Apresentar ao usuário IPs, hostname, porta, certificado, regra exata,
   duração e reversão antes de solicitar a autorização específica.

## Experimento

- Validar primeiro TLS e recusa de cliente não autorizado com fixture
  pequena. Depois, 50 Solo e 48 Party; não ir a 100 nem enviar e-mails.
- Manter leituras a cada 750 ms, full a cada 3 s, renovação a cada 30 s,
  limites e políticas atuais. Separar slots ocupados, atrasados, rejeitados,
  não tentados após aborto, erros HTTP, timeouts e respostas inválidas.
- Medir recursos, loop e fases no A; recursos, atraso de emissão e HTTP no B.
  Registrar UTC, relógio monotônico e desvio observado entre computadores.
  Não alterar relógios ou TTLs para produzir resultado.
- Comparar arquitetura atual compartilhada; gerador em processo separado
  no mesmo PC; gerador em B. A segunda separa interferência de event-loop
  de disputa física; a terceira adiciona RTT, que deve aparecer no relatório.
  Essas variantes pertencem somente à bancada.
- Alternar ordem A/B/B/A, restaurando a mesma fixture em cada repetição.
  Não interpretar estados/RNG diferentes como ganho causal.
- Após passarem as reproduções curtas, duas janelas de 10 min por perfil:
  zero paradas indevidas, slots perdidos e erros; p95 HTTP <500 ms e idade
  <1000 ms. Mostrar também p95 anterior à primeira interrupção.
- Verificar recompensa única, replay e durabilidade em regressões próprias;
  saldo não negativo sozinho não prova ledger correto sob carga.

## Encerramento

Parar somente processos da bancada. Revogar credenciais sintéticas, retirar
regra temporária por ID e confiança do certificado cliente conforme escopo
autorizado. Preservar snapshots, cluster e resultados sanitizados. Conferir
que instalação privada, saves e personagens permanecem intactos. Não
promover main ou hospedagem com base em um teste funcional ou janela curta.
