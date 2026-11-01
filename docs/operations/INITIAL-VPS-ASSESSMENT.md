# VPS inicial — avaliação em 01/11/2026

Recomendação técnica para uma alfa fechada: **Hostinger KVM 2**, Linux, Node/BFF,
PostgreSQL separado logicamente, proxy HTTPS e monitoramento. É uma estimativa de
engenharia para iniciar medições, não uma capacidade de jogadores comprovada.
Não houve compra, provisionamento, alteração DNS nem implantação do backend.

| Plano | vCPU / RAM / NVMe | Oferta mensal equivalente | Total de 24 meses | Renovação mensal equivalente |
|---|---|---:|---:|---:|
| KVM 1 | 1 / 4 GB / 50 GB | R$ 29,99 | R$ 719,76 | R$ 59,99 |
| KVM 2 | 2 / 8 GB / 100 GB | R$ 42,99 | R$ 1.031,76 | R$ 77,99 |
| KVM 4 | 4 / 16 GB / 200 GB | R$ 59,99 | R$ 1.439,76 | R$ 149,99 |

Valores observados na [página oficial](https://www.hostinger.com/br/servidor-vps).
O preço mensal mostrado corresponde ao contrato pago integralmente por 24 meses,
com parcelamento de até 12 vezes. A página informa preços sem VAT; confirmar impostos,
moeda, região, adicionais e valor final no checkout antes de contratar. Não foi
consultado checkout autenticado. Ofertas e renovação podem mudar.

KVM 1 serve como ambiente pequeno de desenvolvimento, mas um único núcleo oferece
menos folga para API, banco, backup e manutenção simultâneos. KVM 2 oferece um ponto
inicial mais equilibrado; KVM 4 só é recomendado quando medições justificarem seu
custo de renovação maior. Não reservar recursos para Kubernetes ou painel pesado.
Construir imagens em CI, não disputar CPU com o jogo durante builds.

## Condições antes de abrir uma alfa

- Escolher região próxima dos jogadores, preferencialmente Brasil se disponível no
  painel da contratação. A [documentação de localizações](https://www.hostinger.com/support/1583267-where-are-hostinger-servers-located/)
  condiciona disponibilidade ao painel; esta avaliação não confirmou estoque em São Paulo.
- Manter estáticos no CDN. Servir painel online e /v1 na mesma origem HTTPS pelo proxy,
  preservando cookies Secure/HttpOnly e CSRF; não trocar para cookies entre domínios.
- PostgreSQL sem porta pública, roles separadas para runtime/migration, segredo local
  fora da imagem e do Git. Supabase Auth continua separado do banco do jogo.
- Backup externo consistente do PostgreSQL, retenção e restauração ensaiada. A Hostinger
  inclui [backup semanal e cobra a opção diária](https://www.hostinger.com/br/support/1583232-como-fazer-backup-ou-restaurar-um-servidor-vps-hostinger/).
  Snapshot temporário de um dia não substitui backup do jogo nem recuperação pontual.
- Logs sem tokens, rotação de logs, métricas de latência p95/p99, CPU, RAM, disco,
  fila de conexões/locks e recuperação após reinício. Alertar antes de esgotar disco.
- Ensaiar carga gradual e concorrência/replay em hardware real. Não prometer quantidade
  de jogadores simultâneos sem esse ensaio. Aumentar plano conforme gargalo medido;
  considerar separar banco quando o isolamento operacional se tornar necessário.

Não confundir assistência de IA da hospedagem com operação do nosso banco/aplicação:
atualizações, firewall, segredos, observabilidade e restauração continuam exigindo
procedimentos sob nossa responsabilidade. A aquisição e a primeira implantação
precisam de uma janela operacional própria, preservando a produção atual.
