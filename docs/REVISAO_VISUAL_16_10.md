# Revisão de arte, interface e experiência — 16/10/2026

Resposta ao pacote `Divertiland_Revisao_Visual_2026-10-16`. Este documento registra o que
foi **auditado, alterado e medido**, e o que **continua pendente**. Nada aqui é declarado
pronto sem evidência; o que não foi testado está dito como não testado.

## 1. Registro da versão (seção 2 do prompt)

| Item | Valor |
|---|---|
| Commit local no início | `5e68ff3` |
| Ramo publicado | `gh-pages` (publicação por `npm run deploy`) |
| Site | https://newtech-system.github.io/divertiland/ |
| Stack | Vite 8 + TypeScript 7 + three.js 0.186, física própria, interface em DOM/CSS, Vitest |
| Testes automáticos antes desta revisão | 96 passando |

### "Ops! Algo deu errado ao abrir o jogo" — diagnóstico honesto

**Não reproduzi o erro.** Abri a versão pública hoje (16/10) e ela carregou normalmente:
tela de título, canvas 3D e menu funcionando. Portanto **não afirmo que o jogo falha para
todos** — e também não descarto o relato.

Causa mais provável, compatível com "inclusive após um recarregamento": a publicação troca
os arquivos com nome versionado (`index-XXXX.js`), e um navegador que guardou o
`index.html` antigo pede um arquivo que já não existe. O recarregamento simples devolve o
mesmo HTML do cache, então o erro se repete.

**Correção aplicada** (`src/main.ts`): ao falhar por arquivo que não carregou, o jogo
**recarrega sozinho uma vez buscando do servidor**. Persistindo, mostra um aviso com botão
"🔄 Tentar de novo" (que também ignora o cache) e o motivo técnico em letra pequena.
Verificado que o reconhecimento do erro funciona e que não dispara em abertura normal.

## 2. Inventário real do conteúdo (seção 2)

| ID atual | Nome atual | Mecânica | Narrativa | Estado | Destino nesta revisão | Save afetado |
|---|---|---|---|---|---|---|
| `a01` | O Ursinho e o Caminho da Gentileza | Exploração 3D | Criança perde o ursinho; pistas, mecanismo, devolução | **Conteúdo final**, termina nos 3 estilos | A01 — Caminho da Gentileza: preservar e reconstruir o visual | `adventures.a01` |
| `a02` | A Casa dos Mistérios | Caça a objetos (`w1_l02`) + enigmas de porta (`w1_l04`) | Preparar a sala para os amigos | Provisório (fases do protótipo) | A02 — Brinquedoteca: **substituir a caça orbital por cena frontal** | `adventures.a02` |
| `a03` | Expresso da Alegria | Corrida (`w1_l03`) | Levar peças da festa | Provisório | A03 — Corrida da Alegria | `adventures.a03` |
| `a04` | A Grande Travessia | Parkour (`w1_l05`) + trampolim (`w1_l07`) + lava (`w1_l08`) | Montar a ponte para o grupo | Provisório | A04 — Grande Circuito em módulos | `adventures.a04` |
| `a05` | Guardiões da Diversão | Narrativa (`w1_l09`) + pega-pega (`w1_s01`) | Gincana e investigação | Provisório | A05 — Pega-pega Neon refeito | `adventures.a05` |
| `w1_l06` | Caça aos Divertis | Plataforma 2D | — | Jogável, fora da campanha | Desafio bônus | `levels.w1_l06` |
| `w1_l10` | Super Desafio | Mistura | — | Jogável, fora da campanha | Desafio bônus (não vira "última fase que mistura tudo") | `levels.w1_l10` |
| `w1_l01` | Bem-vindo à Divertiland | Exploração 3D | — | Base da A01, fora do mapa | Mantido no código como base | `levels.w1_l01` |
| `meu_mundo` | Meu Mundo Divertiland | Espaço livre | — | Terreno mínimo navegável | Aba permanente, construção a implementar | — |
| — | Quem é o Travesso? | — | — | **Não existe** | A06 a criar | — |

Nenhum conteúdo foi apagado nesta rodada. Os 15 IDs de ursinhos dourados e as estrelas
continuam como estão.

## 3. O que mudou nesta rodada (antes → depois)

### 3.1 Falas e avisos fora dos controles (seções 5.4 e V04)

| Antes (teste da proprietária) | Depois (medido) |
|---|---|
| Cartão **"Vire o celular de lado"** no MEIO da tela, por cima do personagem e do caminho, durante a fase | Tarja fina no alto, sem bloquear nada, sem capturar toque |
| Balão de fala no alto à esquerda, **cobrindo o texto da missão** | Faixa própria embaixo e no centro, **acima dos controles** (fala em y 620–701, botão de pulo em y 713–814 num aparelho de 390×844) |
| Legenda clicável sobre a área de jogo | Camada de legenda com `pointer-events: none`: **não rouba o gesto de andar**. Repetir a fala virou botão 🔊 no alto |
| Missão cortada com "..." | Missão em **linha própria**, até duas linhas, texto inteiro: "🎯 Ache as 3 pistas: piscina, portinha e plataformas" |

### 3.2 Bicho-preguiça: assistência de verdade (seção 6 e V06)

| Recurso | Antes | Depois |
|---|---|---|
| Câmera | Só acompanhava quando a criança já ia na direção da câmera; girar exigia segundo dedo | **Automática**: volta para trás do personagem sozinha, devagar; a direção do comando continua travada enquanto o joystick está pressionado (não troca frente/trás) |
| Beirada | Andar reto no vão = queda | **Proteção de borda**: medido — andando reto contra o vão, no Bicho-preguiça o personagem **para na beirada** (z 110, y 4, 0 quedas); no Macaco o mesmo comando cai (y 0) |
| Ajuda | Só depois de 3 quedas | **Botão 🤝 sempre disponível** no alto + oferta automática após **2 tentativas** (valor por estilo: 2 / 4 / 5) |
| Coleta | Raio 1,1 m; ímã de moedas 2,4 m | Raio **1,7 m**; ímã **3,2 m** |

Pulo automático contextual, checkpoints extras e "Vamos juntos?" (que já existiam)
continuam, e a ajuda **não atravessa portão de missão fechado**.

### 3.3 Sistema de missões (defeitos relatados por ela hoje)

Corrigidos e verificados nesta mesma rodada: amigo que pedia o que a criança já tinha na
mão (porta não abria), botões de chão que só acendiam depois de conversar, objetos
voltando ao lugar ao continuar a partida, e o texto de "onde procurar" separado do
"o que aconteceu depois". Detalhes e tabela de verificação em `docs/BACKLOG.md`.

## 4. Testes executados (comandos e resultado real)

| Verificação | Comando | Resultado |
|---|---|---|
| Testes automáticos | `npx vitest run` | **96 passando**, 6 arquivos |
| Tipos | `npx tsc --noEmit` | limpo |
| Build | `npm run build` | ok |
| Aventura 1 inteira, 3 estilos | `__runRoute('a01', estilo, …)` no navegador | **termina nos três**, 0 quedas, 6 etapas, 3 dourados, sala secreta |
| Encaixe de tela — jogo e menus | `__fitGame()` / `__fitAll()` | **sem problemas** em 360×800, 390×844, 844×390, 768×1024 e 1366×768 |
| Percurso (alcance, plataforma isolada, buraco sem saída) | `npx vitest run tests/percurso.test.ts` | 0 problemas nos 10 cenários × 3 estilos |
| Obstrução de visão em todos os checkpoints | `__viewCheck()` | 0 |
| Proteção de borda | medição no jogo (acima) | confirmada, com comparação entre estilos |

## 4.1 Segunda rodada: personagens e cenário (V01 e V02)

### Personagens — adaptação 3D conferida com a prancha

| Elemento da prancha | Antes | Agora |
|---|---|---|
| Olhos | uma esfera escura com brilho | branco com pupila, brilho e **sobrancelha** |
| Orelhas | interior da cor do pelo | **interior roxo** nos dois (marca da identidade) |
| Jhow | sem topete | **topete assimétrico** visível acima dos fones |
| Mina | tranças = 3 bolinhas empilhadas (o documento proíbe isso como solução final) | franja castanha, mechas laterais e **tranças com segmentos que afinam, torção alternada, ponta e laço rosa** |
| Jaqueta do Jhow | azul → verde genérico | **turquesa → verde-limão com acabamento roxo** |
| Mina | colete rosa/lilás, saia roxa lisa | colete **rosa → magenta** e **saia pregueada rosa → roxo** |
| Camiseta | letra D maiúscula | **d minúsculo da marca**, na cor do acabamento |
| Tênis | cápsula + placa retangular embaixo | cabedal, **bico, três cadarços e solado com volume** |

**Honestidade sobre o que isso é:** continua sendo o **boneco procedural** do jogo, agora
muito mais próximo da prancha — não é o modelo final de produção. O que falta para fechar
V01 está na lista de pendências (modelo, rig e animações próprios, PNGs de corpo inteiro e
rostos, e a vista de costas, que **não existe na prancha** e terá de ser interpretada e
aprovada por você).

### Cenário da Aventura 1 — elementos reconhecíveis do parque

Das fotos do parque: **teto preto** com painéis de luz brancos e
luzinhas coloridas; **piso claro de porcelanato**; **paredes escuras com mural de galáxia**
(estrelas, planeta com anel) e **grafismo neon com a carinha sorridente**, desenhados em
canvas; **estrutura do brinquedão verde-clara** com **redes pretas**; **tubo verde**; e
**dois escorregadores paralelos, azul e amarelo**.

Dois defeitos encontrados e corrigidos nessa passagem: o sorteio do mural recebia semente
negativa (posição na parede) e **impedia a fase inteira de carregar**; e os murais estavam
na parede externa, invisível para quem joga.

**Medido depois:** A01 termina nos três estilos com 0 quedas e 6 etapas; 0 obstrução de
visão em todos os checkpoints; encaixe sem problemas em 390×844; 96 testes passando.

## 5. O que falta do prompt de 16/10 (situação em 20/10)

Conferido item a item contra `01_PROMPT_EXECUCAO.md`, abrindo o jogo rodando. Nada aqui
está marcado como pronto sem evidência; "parcial" quer dizer que existe no jogo mas ainda
não cumpre o que o documento pede.

### 5.1 Plano de execução (seção 13)

| Etapa | Situação |
|---|---|
| 1 — Auditoria verificável | **Feita** (seções 1 a 4 deste documento) |
| 2 — Primeira fatia visual e jogável | **Parcial**: Aventura 1 e personagens avançaram; abertura e mapa não foram refeitos |
| 3 — Fechar A01 e acessibilidade | **Quase**: missão, dourados, segredo, checkpoints e save prontos e testados; falta o teste com criança |
| 4 — Refazer caça e demais aventuras | **Não começou** |
| 5 — Travesso e Meu Mundo | **Não começou** |
| 6 — Verificação final e entrega | **Não começou** (falta desempenho medido e migração reverificada) |

### 5.2 Aceitação (seção 14)

| ID | O que exige | Situação |
|---|---|---|
| V01 | Mascotes reconhecíveis | **Parcial.** Em 20/10 os três desvios foram corrigidos (fone no pescoço, "d" como estampa da camiseta pela abertura da jaqueta, acabamento roxo visível) e a trança da Mina deixou de parecer bolinhas empilhadas. Ainda é o boneco procedural: sem modelo/rig/animações de produção, sem PNG de 2048 px nem de rosto, sem vista de costas aprovada. A prancha não estava no computador nesta rodada, então a conferência foi contra o TEXTO das seções 3.1 e 3.2, não pixel a pixel |
| V02 | Parque reconhecível | **Feito na Aventura 1** (20/10). Piso claro, teto e paredes escuros, murais de galáxia e grafismo neon, estrutura verde-clara, redes pretas, tubo verde, os dois escorregadores paralelos e a piscina de bolinhas. O percurso inteiro foi passado para a paleta do parque: corredor, túnel, paredão dos dois caminhos e sala secreta. **Falta nas outras quatro aventuras** |
| V03 | Fases distintas | **Não.** As outras quatro aventuras não foram tocadas |
| V04 | HUD não cobre comando nem objetivo | **Feito e medido** em retrato; falta a composição própria de paisagem |
| V05 | Não leitor entende a introdução | **Não.** A tela de apresentação (5.3) não existe |
| V06 | Criança iniciante avança | **Não comprovado.** A assistência existe e foi medida no robô; o teste com a Sara não aconteceu |
| V07 | Memória visível | **Não** |
| V08 | Caça igual à referência | **Não.** Continua em câmera que gira dentro da sala, o que o documento proíbe |
| V09 | Buraco não prende | **Feito** na Aventura 1 (o buraco virou piscina de bolinhas com trampolins) |
| V10 | Moedas e dourados funcionam | **Feito** na Aventura 1, com rota provada nos três estilos |
| V11 | Física e câmera confortáveis | **Feito** na Aventura 1 |
| V12 | Loja consistente | **Parcial.** Experimentar não debita e a compra é única; mas as miniaturas são emoji, não o item renderizado — inclusive a saia aparece como vestido, o caso que o documento cita |
| V13 | Construção persiste | **Não.** Meu Mundo só tem o terreno |
| V14 | Progresso não duplica | **Feito**, com testes de migração |
| V15 | Prêmios seguem simulados | **Feito** |
| V16 | Texto completo | **Feito e medido** em 360x800, 390x844 e nas demais telas |
| V17 | Desempenho utilizável | **Não medido** em aparelho real |

### 5.2.1 Correção importante na forma de medir (20/10)

A checagem de visão (`__viewCheck`), que eu vinha citando como prova de que nenhum
enfeite tapa o caminho, **estava medindo errado**:

- a fase não avança em pausa, e o jogo pausa sozinho quando a janela perde o foco. Os
  quadros que o teste mandava rodar não rodavam, a câmera ficava onde estava e o raio
  saía de um lugar onde a criança não está. Por isso o mesmo teste dizia "parede a 160
  metros" numa rodada e "limpo" na seguinte;
- depois de um salto de ponta a ponta da fase, a câmera leva bem mais que os 40 quadros
  que o teste esperava;
- o enfeite aos pés da criança — a bandeirinha do próprio ponto seguro — era contado
  como obstáculo.

Corrigido: o teste tira a pausa, **espera a câmera chegar perto da criança**, descarta a
medida se ela não chegar, e ignora o que está aos pés dela. Duas rodadas seguidas depois
disso: **zero obstruções nas 7 fases e em todos os pontos seguros**. Esta é a primeira
medida dessa checagem em que dá para confiar; as anteriores valem menos do que eu disse.

### 5.3 Telas (seção 5)

- **5.1 Abertura** — **refeita em 20/10.** Parede escura com a pintura de galáxia (a mesma
  do jogo), estrutura verde com redes, tubo, escorregadores azul e amarelo, piso claro e
  piscina de bolinhas; Jhow e Mina de corpo inteiro em pé no piso. Nenhuma fase é carregada
  para abrir o menu. Medido sem problemas nos cinco tamanhos.
- **5.2 Mapa** — **refeito em 20/10.** Chão do parque desenhado, brinquedos ao longo do
  caminho, o ícone de cada aventura virou o brinquedo dela (vindo dos dados), nome curto só
  na aventura da vez, carteira e coleção num painel próprio e bloqueio explicado em voz.
  Falta: a planta do parque com os setores nomeados, quando houver arte de produção.
- **5.3 Entrada da aventura** — **não existe.**
- **5.4 Tela de jogo** — **feita em retrato**; falta paisagem e as regiões protegidas dos
  modos caça e memória, que dependem de refazer essas fases.
- **5.5 Loja e conclusão** — **conclusão feita**; loja pendente nas miniaturas.

### 5.4 Assistência (seção 6)

Feito e medido: câmera automática, pulo automático nos pontos válidos, apoios largos,
proteção de borda, coleta generosa, "Vamos juntos?" após duas tentativas conduzindo só o
trecho motor, sem pressão de tempo na missão principal, e retorno que preserva itens.

Falta: a alternativa **"Toque para ir"** (navegação assistida por pontos seguros) e a
escolha do estilo poder ser **ouvida** antes de confirmar.

### 5.5 Conteúdo (seções 8 a 10)

- **A01** — núcleo pronto e, desde 20/10, com o percurso inteiro na paleta do parque.
  Falta a **variação entre partidas** (lugar do ursinho, pistas e
  mecanismo de acesso) que a seção 8 pede.
- **A02, A03, A04, A05** — não refeitas.
- **A06 "Quem é o Travesso?"** — não existe.
- **Meu Mundo construível** (seção 9) — não existe; hoje é só terreno, e o jogo diz isso.
- **Banco de falas e voz** (seção 10) — não existe; só texto e a leitura do aparelho.
- **Entrega de arte** (seção 12) — nenhum dos arquivos da tabela foi produzido.

## 6. Identidade visual lida da prancha oficial (para a próxima etapa)

Registro do que a arte define, para a adaptação 3D ser conferível:

- **Jhow** — urso laranja, topete assimétrico, **orelhas com interior roxo**, focinho claro
  com nariz preto. Jaqueta em degradê **turquesa → verde-limão** com acabamentos roxos e
  capuz; camiseta branca com o "d" da marca em roxo; bermuda cargo preta; **fones pretos
  com detalhe roxo no pescoço**; tênis turquesa com cadarço branco e solado grosso claro.
- **Mina** — ursa laranja, **duas tranças castanhas com laços rosa**, viseira branca com
  faixa rosa, colete rosa/magenta com acabamento roxo sobre camiseta branca com o "d"
  rosa, saia pregueada rosa→roxo, meias claras e tênis rosa com solado branco.
- Observação honesta: a prancha traz frente e três quartos; **não há vista de costas**.
  As costas terão de ser interpretadas e marcadas para revisão sua, como o próprio
  documento pede.

## 7. Como rodar e revisar

```bash
npm install
npm run dev     # abre em http://localhost:5173
npm test        # 96 testes
npm run build   # build de produção em dist/
```

No navegador, com `npm run dev`, as ferramentas de verificação ficam disponíveis no
console: `__fitGame()`, `__fitAll()`, `__viewCheck()`, `__audit()` e
`__runRoute('a01','sloth',__routes.a01)`.

**Publicação:** nada desta rodada foi publicado. O site continua com a versão anterior até
você autorizar.
