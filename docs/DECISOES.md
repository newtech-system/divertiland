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

## Decisões do Marco 2 (aventuras, mapa e Meu Mundo)
- **A Aventura 1 é construída sobre o parque da Fase 1.** Nada foi jogado fora: as correções
  do Marco 1 (plataforma de chegada, placas fora da linha do salto, piscina de bolinhas)
  continuam lá, e a história entra por cima. A Fase 1 antiga sai do mapa.
- **Quem já tinha a Fase 1 concluída não ganha a Aventura 1 de graça**: a história é nova e
  precisa ser jogada uma vez. Ursinhos, segredos e Divertis antigos continuam valendo.
- **Continuar uma partida devolve os objetos de uma coleta pela metade ao lugar**, mas mantém
  o que já foi entregue. É o comportamento mais seguro: nunca tranca a criança do lado errado
  de um portão, e nunca paga a mesma entrega duas vezes.
- **A ajuda "Vamos juntos?" nunca atravessa um portão de missão fechado.** Ajuda é de
  controle, não de história: ela não pula etapa nem entrega a missão pronta.
- **O Meu Mundo é um espaço livre**: sem estrela, sem conclusão, sem moedas e sem gravar
  partida em andamento. Entrar e sair dele nunca mexe no progresso de uma aventura.
- **O mapa diz quando uma aventura ainda é provisória.** A02 a A05 aparecem com o selo
  "versão provisória" enquanto usarem etapas do protótipo.
- **Metas dos baús ajustadas** (4/9/14 estrelas) porque a campanha passou a ter 15 estrelas.
- **"Bia"**, a criança da Aventura 1, é nome provisório — como os amigos de pelúcia.

## Itens que precisam da sua decisão (produto/marca)
- Nomes dos amigos de pelúcia da Fase 9 (Mamãe Ursa, Ursinho Fofo, Dino Fofo, Robô Beto, Pato Quack)
  e do "Dino Fofo" da corrida são **provisórios** — podem virar personagens oficiais da marca.
- Vozes oficiais do Jhow e da Mina (dublagem).
- Plataforma de publicação (site, loja de apps) e se haverá conta/nuvem.
