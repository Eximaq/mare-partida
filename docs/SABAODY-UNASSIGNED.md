# Sabaody: recursos aprovados e histórico da preparação

**Estado atual:** os quatro comuns integram Sabaody; Kuma e Kizaru integram as masmorras de níveis 120 e 130. Veja [regiões 114–180](LATE-ARCHIPELAGO.md). As tabelas e descrições abaixo registram os níveis e o escopo da preparação original, anteriores à ativação.

| Monstro | Nível | PV | Ataque | Def. física | Def. mágica | XP nominal |
|---|---:|---:|---:|---:|---:|---:|
| Bartholomew Kuma | 110 | 161.606 | 4.573 | 3.114 | 1.161 | 0 |
| Kizaru | 120 | 186.615 | 4.982 | 3.393 | 1.260 | 0 |
| Pacifista | 131 | 372.822 | 10.443 | 3.796 | 398 | 34.800 |
| Urouge | 136 | 435.851 | 11.903 | 4.266 | 439 | 37.600 |
| Basil Hawkins | 141 | 509.606 | 13.572 | 4.794 | 485 | 40.600 |
| X Drake | 146 | 595.902 | 15.475 | 5.392 | 534 | 43.700 |

Kuma e Kizaru usam a mesma curva de atributos de chefe de Crocodile, Lucci e Moria. Os comuns continuam a referência de Oars 127, com XP proporcional por nível. O XP é apenas nominal. Nenhum perfil foi incluído em mapas, encontros, masmorras, rotações, Impel Down, missões, saque ou recompensas. Sem atualização de saves ou regras do servidor.

As nove formas usam 144 tiras PNG de quatro quadros 192×192, com âncora (96,166) e Oeste espelhado de Leste. As 36 tiras Sul previamente aprovadas são verificadas byte por byte no importador. Não há carregamento de sprites no startup.

X Drake inicia humano, reage ao primeiro dano positivo e assume a forma Zoan após a breve reação. A forma persiste até desligar do combate, iniciar o retorno ou morrer. Urouge ampliado e Hawkins de palha têm clipes completos e um seletor visual explícito por ator, sem acionar condições automáticas, alterar atributos ou mover o combate. Nenhum encontro ativo para testar combate real.

Teste local: `node --test tests/sabaody-unassigned.test.cjs`. Para verificar o cliente estático, gere com `python tools/build_pages.py --static-demo`, sirva localmente e rode `MARE_TEST_URL=http://127.0.0.1:8165/dist/ node tests/sabaody-browser.cjs`.
