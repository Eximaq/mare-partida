# Criação e harmonização HD — auditoria

Base: d87f40d, após PR #184. Branch feature/creation-gameplay-harmony-hd.

Sua Classe será uma lista compacta de sete opções e um painel com os três intermediários e os três finais reais de MareTalents.getTree. Atributos iniciais vêm de MareCharacters.birth; nomes e bônus de facção usam o catálogo configurado do jogo. A edição de identidade existente permite alterar facção; portanto não será exibida uma proibição inexistente.

O material reutilizado será assets/ui/forge-hd/workshop-surface.png (512×512), com proveniência no manifesto da Forja e token --rpg-workshop-surface. Ícones especiais, classes e quatro emblemas serão reaproveitados. As ilustrações de identidade faltantes serão produzidas no PixelLab AI, sem novos sprites ou ícones de habilidade.

Foram registrados 63 estados de geometria em nove viewports antes de editar: 1672×941, 1920×1080, 1366×768, 1280×720, 1024×768, 760×900, 393×852, 320×568 e 844×390. Evidências e JSON completos permanecem em tmp, fora do Git.

Em 1672×941: menu principal x1334/y18/320×52; ações x733,5/y865/205×58; chat aberto x18/y739/294×184; expedição aberta x1366/y184/288×587; widget diário x1410/y731,203125/244×143,796875; Explorar os mares x1410/y885/244×38. Serão comparados com os mesmos estados finais, sem mudanças de posicionamento e tamanho autorizadas nessas HUDs.
