# Decisões técnicas e de design

Decisões tomadas de forma autônoma (reversíveis), conforme combinado no documento do projeto.

## Tecnologia
- **Web (Vite + TypeScript + Three.js)** em vez de motor pesado: roda no navegador de computador,
  tablet e celular sem instalação, carrega rápido e pode virar app (Capacitor) ou PWA depois.
- **Física própria** (caixas alinhadas, rampas, cilindros) em vez de biblioteca de física: o mundo
  da Divertiland é feito de blocos de espuma; isso dá controle previsível para crianças e é leve.
- **Interface em HTML/CSS** sobre o 3D: botões grandes e nítidos em qualquer tela, acessibilidade.
- **Sons e músicas sintetizados** (Web Audio) como placeholder — nenhum arquivo de áudio necessário.
- **Narração** pela voz do aparelho, **somente vozes locais** (o texto não sai do aparelho).

## Design
- **Ordem das fases ajustada**: 1 exploração → 2 objetos escondidos → 3 corrida → 4 puzzle → 5
  parkour → 6 plataforma 2D → 7 trampolim → 8 chão é lava → 9 narrativa → 10 bônus. Motivo: nenhuma
  fase seguida tem a mesma mecânica (pedido central do projeto). "Caça aos Divertis" virou a fase de
  plataforma 2D (o tipo F não estava na lista inicial).
- **Estrelas:** ⭐ por concluir + 1 por objetivo bônus cumprido (cada fase tem 3 objetivos bônus para
  2 estrelas extras) → crianças diferentes chegam às 3 estrelas por caminhos diferentes.
- **Bicho-Preguiça nunca ganha menos**: os estilos mais difíceis ganham bônus extra; a base é igual.
- **Erros nunca eliminam**: cair = voltar ao checkpoint em menos de 1 s; no runner, bater = tropeçar
  e seguir; no puzzle, errar = a porta pisca e tenta de novo; mensagens sempre positivas.
- **Bicho-Preguiça** recebe: checkpoints e escadinhas extras, plataformas maiores, obstáculos mais
  lentos, ímã de moedas maior, trilha de brilhos e dicas, mais dicas nos puzzles.
- **Jaguar** recebe: obstáculos mais rápidos, plataformas menores, rotas especiais com gemas,
  cronômetro, menos dicas, recompensa maior.
- **Compra em 2 toques** (confirmação) para evitar compra acidental; nenhum dinheiro real, sem loot box.
- **Perfis múltiplos** no mesmo aparelho (irmãos); só o apelido é guardado.
- **Área dos pais** (nos Ajustes): mostra as habilidades trabalhadas (`skillFocus`) — nunca exibidas
  para a criança como "aula". Apagar perfil exige segurar o botão 3 segundos.
- **Controle no ar generoso** (crianças corrigem o pulo no meio do caminho).
- **O mascote guia** é sempre o outro personagem (quem joga com Mina é guiado pelo Jhow e vice-versa).

## Itens que precisam da sua decisão (produto/marca)
- Nomes dos amigos de pelúcia da Fase 9 (Mamãe Ursa, Ursinho Fofo, Dino Fofo, Robô Beto, Pato Quack)
  e do "Dino Fofo" da corrida são **provisórios** — podem virar personagens oficiais da marca.
- Vozes oficiais do Jhow e da Mina (dublagem).
- Plataforma de publicação (site, loja de apps) e se haverá conta/nuvem.
