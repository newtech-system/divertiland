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
- **Jaguar** recebe: rotas especiais com gemas, obstáculos mais rápidos, cronômetro opcional,
  menos dicas e recompensa maior. **Mudança (Marco 1 do prompt V2):** as plataformas do Jaguar
  voltaram ao tamanho normal (antes encolhiam 15%) e as tolerâncias de pulo continuam valendo
  nele. Motivo: a seção 6 do documento é explícita — no Jaguar o desafio é de *decisão, rota e
  enigma*, nunca salto fora do alcance ou controle pior.
- **Assistência de controle ≠ complexidade da missão** (seção 6). São dois eixos separados:
  o Bicho-Preguiça ganha ajuda motora (pulo automático na beirada, "Vamos juntos?", desvio e
  abaixar automáticos na corrida) **sem** perder a missão, a história ou a recompensa base.
- **Ninguém fica preso**: 3,5 s empurrando sem sair do lugar (ou 1 s na corrida) e o jogo
  resolve — leva ao ponto seguro ou passa por cima do obstáculo, sempre com uma fala gentil.
- **Nada tapa a visão** (seção 7.2): placas, bandeiras de checkpoint e balões ficam
  translúcidos quando entram entre a câmera e a criança.
- **Três categorias visuais** (seção 16): enfeite (fosco e parado), interação (ícone) e
  coletável (brilho + movimento). Enfeite que parece prêmio dá um "boing" ao toque, para
  ficar claro que é enfeite — sem prometer recompensa.
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
