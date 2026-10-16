# Registro de problemas do protótipo (B01–B40)

Este é o backlog rastreável pedido na seção 23 do prompt mestre V2. Cada linha tem um
**estado** e a **evidência** de como foi verificado.

| Estado | Significado |
|---|---|
| ✅ corrigido | reproduzido (ou causa encontrada no código), corrigido e verificado |
| 🔍 verificado, sem defeito | investigado e o comportamento está correto — nada a corrigir |
| 🧪 ferramenta de verificação criada | existe agora um teste automático que prova/acusa este caso |
| 🚧 planejado | depende da reconstrução das aventuras (Marcos 2–3) ou de material da proprietária |

> **O que é evidência:** medida no navegador com as ferramentas de desenvolvimento
> (`__sim`, `__qaAll`, `__audit`, `__fitAll`), teste automático em `tests/`, ou leitura do
> trecho de código que causa o problema. Relato não reproduzido fica identificado como tal.

---

## P0 — bloqueiam a experiência

### B01 — Moedas aparecem longe e somem ao aproximar ✅
**Causa encontrada (não era impressão).** As moedas são desenhadas em lote (`InstancedMesh`).
O three.js calcula a "esfera de visibilidade" do lote **uma única vez**, na primeira vez que
precisa dela — e nesse momento todas as moedas ainda estão na origem do mapa. Medido no
jogo: esfera com centro `(0,0,0)` e raio `0,32 m`, enquanto as 97 moedas da Fase 1 se
espalham de `z = -6,5` a `z = 172,4`. Resultado: assim que a criança andava e a origem saía
da tela, **o lote inteiro de moedas desaparecia** — em todas as fases 3D e na corrida.
**Correção:** `frustumCulled = false` nos lotes de moedas e gemas (são poucas dezenas;
custo irrelevante). `src/levels/exploration/LevelBuilder.ts`.

### B05 — Buraco perto do totem de chegada aprisionou a personagem ✅ 🧪
**Causa encontrada.** A plataforma da chegada da Fase 1 tinha 12 m de largura dentro de uma
sala de 24 m, deixando **duas valas de 7 m de profundidade** ao lado do totem. Quem caía
ali não tinha como sair (o pulo alcança 1,77 m).
**Correção:** a plataforma passou a ocupar a sala inteira (`x -12..12`).
**Além disso:** criei um detector automático de buracos sem saída
(`findTraps` em `src/levels/exploration/layoutAudit.ts`) que varre a fase em quadradinhos de
75 cm, liga o que o pulo alcança e acusa as "ilhas" de onde não se sai. Ele **encontrou mais
duas áreas** na Fase 1 que ninguém havia relatado, e confirmei na mão que a personagem
realmente não escapava delas (teleporte + 4 s correndo e pulando em 8 direções: ficava em
`y = 0,6`). Uma era a vala corrigida; a outra (fosso do caminho das plataformas) já tinha
`killZone` e devolve ao ponto seguro — o detector agora entende isso.
O teste `tests/percurso.test.ts` roda esse detector em todas as fases, nos três estilos.
**Recuperação, em todos os estilos:** se a criança ficar 3,5 s empurrando algo sem sair do
lugar, o guia diz "Acho que travamos aqui!" e leva de volta ao ponto seguro
(`Exploration3DLevel.assist`). Na corrida existe o equivalente (`RunnerLevel.unstick`).

### B06 — Movimento, curvas e pulo desconfortáveis; difícil saber frente/trás ✅
**Causa encontrada.** A direção do comando era recalculada a cada quadro a partir da câmera,
e a câmera se vira sozinha para ficar atrás de quem anda. Os dois juntos formam uma
realimentação: a referência de "frente" muda **durante** a corrida. Pior: a câmera girava
até com a criança andando de lado ou de costas, e aí "para frente" virava "para trás".
**Correções:**
1. a referência frente/direita é **congelada** enquanto o comando está pressionado e só é
   recalculada quando a criança solta ou mexe na câmera de propósito;
2. a câmera só acompanha quando a criança já vai mais ou menos para onde ela olha
   (tolerância de 1,3 rad em vez de 2,2);
3. **correção de quina**: raspar o canto de uma plataforma empurra o personagem até 26 cm
   para o lado em vez de cancelar o pulo (`CharacterBody.cornerNudge`);
4. tolerâncias maiores: pulo aceito até 0,2 s antes de pousar, e 0,26 s / 0,20 s / 0,18 s de
   "coyote time" (Preguiça/Macaco/Jaguar).

### B09 — Bicho-Preguiça ainda exige esforço motor excessivo ✅
**Correções (assistência de controle, separada da complexidade da missão — seção 6):**
- **Pulo automático contextual** nas fases 3D: chegando na beirada com apoio ao alcance, o
  pulo sai sozinho.
- **"Vamos juntos?"**: depois de 3 quedas no mesmo trecho, o guia pergunta com dois botões
  grandes; aceitando, ele conduz a criança até o próximo ponto seguro.
- **Corrida**: a ajuda olha bem à frente, escolhe a faixa mais livre (atravessando a do meio
  quando precisa), abaixa sozinha nas barras e pula nos obstáculos baixos.
- **Fileiras do percurso**: no estilo tranquilo nunca fecham duas faixas na mesma fileira
  (trocar duas faixas de uma vez é esforço motor demais).

**Evidência 1 — corrida sem nenhum comando (Bicho-Preguiça):** antes ficava presa em
`z = 578` com 165 batidas e nunca terminava; agora **termina a fase inteira** (z 1043/1044)
com 3 batidas.

**Evidência 2 — pulo automático nas fases 3D:** no caminho das plataformas da Fase 1,
segurando **só "para frente", sem apertar pular nenhuma vez**:
| | até onde foi | altura final | quedas |
|---|---|---|---|
| com a ajuda | z 111,6 → **136,9** | 4,0 (em cima das plataformas) | **0** |
| sem a ajuda | z 111,6 → 127,9 | 0,0 (no fosso) | 1 |

**Evidência 3 — "Vamos juntos?" de ponta a ponta:** forcei 3 quedas no mesmo trecho; o
guia perguntou com dois botões grandes ("🤝 Vamos juntos!" / "💪 Deixa que eu tento"),
o desafio ficou parado durante a pergunta, e ao aceitar o jogo escureceu a tela, **ativou o
checkpoint de verdade** (`cp1`), colocou a criança lá e só **depois de chegar** disse
"Chegamos! Daqui pra frente é com você". A contagem de quedas zera a cada checkpoint, então
"3 quedas" significa 3 quedas *naquele trecho*.

### B22 — Abaixar na corrida não funciona ✅
**Investigado.** A mecânica existia e funcionava (colisão cai de 1,45 m para 0,72 m) — medido
no jogo: passou por baixo das barras em `z = 78` sem batida. O problema real era **o tempo**:
abaixar era um pulso fixo de 0,8 s, então apertar um pouco antes da barra não valia nada e a
criança batia mesmo tendo abaixado.
**Correções:** agora fica abaixado **enquanto** segura (tecla ↓/S, direcional do gamepad, ou
dedo na tela depois de deslizar para baixo), com mínimo de 0,25 s para o toque rápido
também funcionar; e o estilo tranquilo abaixa sozinho.

### B34 — Dá para andar na lava e por baixo do percurso ✅
**Causa encontrada.** A lava era testada por uma caixa de gatilho de **35 cm de altura**
comparada com o **peito** do personagem (pés + 0,70 m). Em pé na lava, o peito ficava
acima da caixa: nunca disparava. Medido: personagem em pé sobre superfície `lava`, 0 quedas.
**Correção:** lava agora é perigo por **contato**, em qualquer face (em cima, de lado ou
dentro), usando a superfície do chão e a caixa do corpo. Medido depois: 1 queda imediata.

### B39 — Risco: repetir fases/ursinhos multiplicar prêmios 🚧
Planejado para o Marco 2 (IDs permanentes dos 15 ursinhos, concessões únicas por chave
estável, livro-caixa de recompensas). Hoje o jogo não emite nenhum prêmio real.

### B40 — Risco: saldo de teste virar prêmio real 🚧
Planejado para o Marco 2: marcação `simulação` e resgate real desligado. Hoje **não existe**
catálogo de prêmios presenciais no jogo, então não há risco em produção.

---

## P1 — compreensão, acessibilidade e qualidade

| ID | Estado | O que foi feito / o que falta |
|---|---|---|
| B02 Divertis anunciados sem ver moedas | 🚧 Marco 2 | A tela final vai separar "moedas que você pegou" de "bônus da missão", e mostrar o acumulado separado do ganho da partida (seção 16) |
| B03 Estrelas do caminho não coletadas | ✅ | Estrela de **enfeite** agora é fosca, parada, presa num suporte — não gira, não flutua, não brilha. Só o que é coletável tem brilho e movimento de coleta |
| B04 Terceiro dourado não localizado | 🧪 🚧 | O validador prova que **todos** os colecionáveis das fases estão ao alcance nos três estilos (`auditLayout`). Ou seja: não é impossibilidade, é falta de pista — as pistas entram no Marco 2 (A01) |
| B07 Placa "Plataforma" cobre o salto | ✅ | Placas saíram do lote estático e **ficam translúcidas** quando atrapalham. O trecho vigiado vai da câmera até **6 m à frente** da criança (a placa que incomoda está adiante, não em cima dela). As duas placas da bifurcação também mudaram de lugar: foram para as paredes laterais, acima da linha do salto |
| B08 Bandeira de checkpoint cobre o destino | ✅ | Mesmo sistema: bandeiras e balões também ficam translúcidos. **Verificado como a seção 7.2 pede** ("testar todos os checkpoints olhando para o próximo salto"): `__viewCheck()` vai a cada checkpoint de 5 fases, olha para frente e dispara raios — nenhum enfeite opaco atrapalhando. Autoteste do verificador: com o efeito desligado ele acusa 4 obstruções em cada checkpoint; com o efeito ligado, nenhuma |
| B10 Plataformas móveis/que somem frustram | 🧪 🚧 | O validador garante alcance com margem por estilo; afinação de tempo/aviso entra na reconstrução da A04 |
| B11 Missão do ursinho não existe | 🚧 Marco 2 | É o coração da A01 |
| B12 Chegada não deixa claro o que foi cumprido | 🚧 Marco 2 | |
| B13 Sala secreta | 🚧 Marco 2 | A descoberta funciona (a proprietária confirmou); pistas e conteúdo entram na A01 |
| B14 Voz não agradou | 🚧 decisão | Depende de aprovar amostras de voz (ver lista de pendências) |
| B15 Visual genérico, muito roxo | 🚧 decisão | Depende das fotos reais do parque e da arte oficial |
| B16 Jhow e Mina não correspondem | 🚧 decisão | Depende das artes oficiais frente/lado/costas |
| B17 Miniaturas diferem dos alvos | 🚧 Marco 3 | Regra "mesma arte para miniatura e alvo" na A02 |
| B18 Objetos atravessam estantes | 🚧 Marco 3 | Encaixes válidos na A02 |
| B19 Sala de busca só gira | 🚧 Marco 3 | A02 vira cena ilustrada navegável |
| B20 Mesmos objetos nos mesmos lugares | 🚧 Marco 3 | Gerador de variação com semente |
| B21 Faltam instruções sobre moedas/dourados | 🚧 Marco 2 | Tutorial contextual com o modelo real do objeto |
| B23 Corrida sem identidade do parque | 🚧 Marco 3 | A03 reconstruída com trechos reconhecíveis e entregas |
| B24 "Pegue três gemas" sem apresentação | 🚧 Marco 3 | Viram três peças de missão apresentadas antes |
| B25 Tênis parecem blocos | 🚧 decisão | Arte final |
| B26 Nome/ícone/produto da loja não correspondem | 🚧 Marco 3 | Miniatura renderizada do item real |
| B27 Provador confundido com compra | 🔍 | **Verificado: não há defeito.** O provador só calcula a aparência (`resolveLook(preview)`) e não toca no saldo; `purchase()` debita uma vez só e recusa item repetido. Teste automático novo cobre o cenário 26.2 #7 (experimentar → comprar → equipar) |
| B28 Memória de cores sem explicação | 🚧 Marco 3 | Estados "Observe"/"Sua vez" e repetição sem penalidade na A02 |
| B29 Associação e padrões não explicados | 🚧 Marco 3 | |
| B30 Cadeados concluídos continuam fechados | 🚧 Marco 3 | |
| B31 Tempo corre enquanto a pessoa entende | 🚧 Marco 3 | Instrução fora do cronômetro |
| B32 Trampolins sem instrução | 🧪 🚧 | O alcance dos trampolins está medido (4,49 / 6,15 / 8,07 / 9,97 m por quique) e validado contra os itens altos; a instrução antes do primeiro salto entra na A04 |
| B33 Presentes e balões parecem coisas para pegar | ✅ | Enfeites que parecem prêmio dão um "boing" ao toque (reagem, mas não premiam) e os coletáveis têm linguagem visual própria |
| B35 Nove fases repetem mecânicas | 🚧 Marcos 2–3 | Escopo passa a ser 5 aventuras |
| B36 Pega-pega curto demais | 🚧 Marco 3 | Integrado à gincana da A05 |
| B37 "Você conquistou" cortado | ✅ 🧪 | Corrigido na passagem de responsividade (interface que cabe de 280×653 a 1280×800). Agora existe o verificador de **texto cortado** (`textCheck`), que entrou no conferidor de telas: autoteste com um título encolhido de propósito → acusou "texto cortado na largura (420 > 60)"; nas telas de verdade, `__fitAll()` e `__fitGame()` em 360×640 e 1024×768 (incluindo a tela de resultado) → **nenhum texto cortado** |
| B38 Theo acha simples, iniciante sofre | ✅ base | Assistência de controle e complexidade de missão agora são coisas separadas (seção 6); o conteúdo que explora isso vem nas aventuras |

---

## Relato corrigido pela própria proprietária (não tratar como defeito)

- **"Não desbloqueou a próxima fase"** — ela confirmou depois que desbloqueou. Nada a fazer.
- **Sala secreta "não existe"** — foi encontrada depois. A descoberta fica registrada.
- **Provador = compra** — esclarecido; ver B27.

---

## Ferramentas de verificação criadas neste marco

| Ferramenta | Para que serve | Como rodar |
|---|---|---|
| `src/engine/physics/reachProbe.ts` | **Área de teste de movimento** (seção 7.1): mede pulo, distância, tempo no ar, degrau e trampolim simulando a física de verdade | `npx vitest run tests/percurso.test.ts` ou `__audit()` no navegador |
| `src/data/reach.ts` | Os números medidos, documentados. Se alguém mexer na física, o teste quebra | — |
| `src/levels/exploration/layoutAudit.ts` | Valida **percurso**: item fora de alcance, plataforma isolada e **buraco sem saída** | `__audit()` no navegador |
| `tests/percurso.test.ts` | Roda tudo acima em todas as fases, nos três estilos | `npm test` |
| `__qaAll()` | Piloto automático joga as fases 3D inteiras | no console do `npm run dev` |
| `__fitAll()` / `__fitGame()` | Confere se tudo cabe na tela, inclusive **texto cortado** | no console do `npm run dev` |
| `__viewCheck()` | Vai a cada checkpoint e acusa enfeite opaco tapando a visão (seção 7.2) | no console do `npm run dev` |

---

# MARCO 2 — Aventura 1, mapa das cinco aventuras e Meu Mundo

Seções do documento `MARCO_2_DIVERTILAND.md` (13/10/2026). Mesma regra de sempre: só está
marcado como pronto o que foi **executado e medido**; o que não foi testado está dito.

## 1. Auditoria do que já existia (seção 2 do documento)

Cada item relatado como "já implementado" foi conferido no código **e** ligado a um teste
que o prova. Nada foi marcado como pronto por causa do relato.

| Item a preservar | Está implementado? | Teste que prova |
|---|---|---|
| Cinco aventuras com etapas internas | Sim — `src/data/adventures.ts` (4 a 6 etapas cada) | `tests/aventuras.test.ts` "são cinco, com 4 a 6 etapas…" |
| 15 estrelas e 15 ursinhos de identidade permanente | Sim — `MAX_CAMPAIGN_STARS`/`MAX_GOLDEN_TEDDIES`, id permanente por ursinho | `tests/aventuras.test.ts` (ursinho repetido não duplica; estrelas 1→3 somam 2) |
| Dois saldos separados, Pontos de Troca em simulação | Sim — `data/rewards.ts` (`REWARD_MODE = 'simulacao'`, resgate desligado) | `tests/aventuras.test.ts` "resgate desligado e nenhuma faixa com pontos definidos" |
| Livro-caixa / não pagar duas vezes | Sim — `systems/RewardLedger.ts` com chave estável | `tests/aventuras.test.ts` (duas concessões → uma entrada) |
| Migração de saves antigos sem perder progresso | Sim — `MIGRATIONS[1]` | `tests/aventuras.test.ts` (save v1 → cinco aventuras, sem pagar de novo) |
| Faixas de brinde sem pontos definidos | Sim — `PRIZE_TIERS` com `points: null` | `tests/aventuras.test.ts` (todas as faixas com `points === null`) |

**Dois defeitos encontrados nessa auditoria** (nenhum estava no relato):

1. Numa aventura de **duas jogadas**, os Divertis da primeira etapa nunca eram creditados —
   `applyRun` só creditava no fim. Corrigido em `AdventureService.applyRun`.
2. **A migração pagava de novo.** As chaves do livro-caixa só eram criadas para aventuras
   já concluídas. Quem tinha a A04 pela metade (um ursinho achado) ou um segredo antigo
   recebia o bônus **outra vez** na primeira conclusão. Pior: os três ursinhos da Fase 1
   não eram traduzidos para a Aventura 1 e **sumiam da coleção**, contrariando a regra de
   identidade permanente. Agora todo ursinho e todo segredo que a criança já tinha entra
   como "já pago", a Fase 1 tem a tradução antiga declarada nos dados (`legacyFrom`), e
   três testes novos provam isso jogando a aventura migrada até o fim e conferindo que o
   livro-caixa não tem nenhuma linha de ursinho ou segredo.

## 2. Entrega A — Aventura 1 jogável de ponta a ponta

`src/data/levels/a01.ts`, construída **sobre o parque da Fase 1** (seção 24.1: preservar o
que funciona), com as correções do Marco 1 intactas e a história por cima.

| Etapa | O que a criança faz | Como o jogo sabe que terminou |
|---|---|---|
| 1 Chegar e aprender | anda, pega Divertis, pula e atravessa o túnel | zona de mensagem na saída do túnel |
| 2 Perceber e acolher | conversa com a Bia, que perdeu o ursinho | primeira fala da Bia (`stageMeet`) |
| 3 Encontrar pistas | 3 pistas em três lugares diferentes: piscina de bolinhas, atrás da portinha do botão e no caminho das plataformas | missão de coleta concluída com a Bia |
| 4 Preparar um caminho | leva 2 peças de apoio ao Robô Beto; a porta do recanto abre | missão do Beto concluída (abre o portão) |
| 5 Encontrar e devolver | escolhe o ursinho CERTO entre três parecidos e devolve na mão da Bia | segunda missão da Bia concluída |
| 6 Celebrar a ação | escorregador, trampolins e a festa da chegada | chegada |

Também entram: a **sala secreta** do protótipo (agora com desafio próprio: plataformas +
trampolim), os **3 ursinhos dourados**, e um amigo **opcional** (Dino Fofo) que vale a
estrela "uma ajuda a mais no parque".

**Evidência — a aventura inteira, jogada pelo piloto automático com física e interação
reais (sem teleporte e sem ligar flag por fora; conversar usa o mesmo caminho do botão ✋,
que exige estar perto de verdade):**

| Estilo | Terminou? | Tempo | Quedas | Divertis | Etapas | Dourados | Segredo |
|---|---|---|---|---|---|---|---|
| 🦥 Bicho-Preguiça | sim | 111 s | 0 | 85/112 | 6 de 6 | 3 de 3 | sim |
| 🐒 Macaco | sim | 110 s | 0 | 71/112 | 6 de 6 | 3 de 3 | sim |
| 🐆 Jaguar | sim | 100 s | 0 | 61/113 | 6 de 6 | 3 de 3 | sim |

(O piloto não lê os textos nem explora; uma criança leva bem mais que isso — a meta de
10 a 20 minutos continua a ser medida com criança de verdade.)

**Defeitos encontrados jogando (e corrigidos):**

- **Rede de voltar da piscina embaixo da ponte.** Subir pelo meio era impossível: a cabeça
  batia na ponte de rede e a personagem travava em `y = 2,35 m` indefinidamente. Agora são
  duas redes nas laterais, fora da sombra da ponte.
- **O recanto tranquilo estava cortado por uma parede do parque.** A sala ia até `x -26` e
  a parede externa (`x -16`) passava no meio dela: o ursinho dourado #3 ficava inacessível e
  a personagem ficava presa encostada na parede (medido: `x -15,41`, subindo sozinha até
  `y 6,1`). A sala foi reconstruída dentro do espaço livre do parque (`x -15,7 a -9`).
- **Missão travava se a criança pegasse os objetos ANTES de conversar** (defeito antigo, que
  valia para todas as fases com amigos): o amigo ficava esperando para sempre e o portão
  nunca abria. Agora, ao começar a missão, o jogo confere se ela já está cumprida.
- **O último salto da festa era marginal.** O trampolim grande ficava a 2,6 m da borda da
  plataforma: quicando a 8,4 m a personagem ainda caía de volta (medido 3 vezes). O
  trampolim foi aproximado (vão de 0,5 m).
- **Ursinho da Bia fora do alcance confortável**: ficava no meio do banquinho; passou para a
  borda da frente (o raio de coleta é 1,1 m).
- **A ajuda do Bicho-Preguiça pulava itens obrigatórios.** Depois de três quedas no fosso, o
  próximo ponto seguro era o do outro lado do caminho das plataformas — a criança seria
  levada para depois da pista 3 e da peça de apoio, que são obrigatórias. Agora o caminho
  das plataformas tem **quatro pontos seguros só no Bicho-Preguiça**, cada um ao lado do que
  ela precisa pegar. Verificado acionando a ajuda de verdade (ver teste 3).
- **Sair no meio apagava o ursinho dourado.** "Recomeçar etapa" limpava a partida salva e a
  coleção ia junto. Agora sair guarda o que é permanente. Medido: pegar o ursinho da
  entrada → sair → recomeçar a etapa → o mapa continua mostrando **🧸 1/3**.

## 3. Entrega B — mapa das cinco aventuras

`src/ui/screens/AdventureMapScreen.ts` substitui o mapa das dez fases.

- As **cinco aventuras** com estrelas, ursinhos e **a próxima etapa escrita em linguagem de
  criança**; aventura trancada diz o que falta ("termine a anterior").
- **Honestidade (seção 10 do documento):** a A01 é conteúdo final; A02–A05 aparecem com o
  selo **"versão provisória"** porque ainda usam etapas do protótipo. Nada é apresentado
  como pronto sem estar.
- Entrada **separada e sinalizada** do **Meu Mundo**, com a contagem de peças conquistadas.
- Dois **desafios bônus** (as fases antigas "Caça aos Divertis" e "Super Desafio"), que não
  valem estrela da campanha nem ursinho — e dizem isso no cartão.
- Ida e volta entre mapa, aventura e Meu Mundo **sem apagar save** (verificado, ver 5).

## 4. Entrega C — Meu Mundo (terreno mínimo)

`src/data/levels/meu_mundo.ts`: terreno cercado de 60×60 m, caminho central, cinco
**terrenos reservados** (um por aventura, cada um com a placa da peça que vai receber),
área de brincar com trampolins e piscina de bolinhas, e o **portal de saída** sinalizado.

É um **espaço livre**: não tem estrela, não tem conclusão, **não dá Divertis** (não há
nenhuma moeda lá) e **não grava partida em andamento**. A interface diz, no cartão e dentro
do terreno, que construir, decorar e visitar amigos chegam nas próximas atualizações.

## 5. Testes de aceitação (seção 8 do documento)

| # | Caso | Resultado |
|---|---|---|
| 1 | Criança entende a missão, acha as 3 pistas, devolve o ursinho, acha a sala secreta e chega ao fim | ✅ nos três estilos (tabela acima) — **falta o teste com criança de verdade** |
| 2 | Voltar ao mapa, ver o estado atualizado e entrar/sair do Meu Mundo | ✅ medido: entrar no Meu Mundo, encostar no ponto seguro de lá e sair pelo portal **não mexeu** na partida salva da A01 (continuou `a01`, 8 s, checkpoint `cp3`) |
| 3 | Bicho-Preguiça completa com ajuda; Macaco e Jaguar sem caminho impossível | ✅ os três terminam com **0 quedas**; e a ajuda foi **acionada de verdade**: 3 quedas no fosso → o Jhow ofereceu "Vamos juntos?" → aceitando, a criança foi parar na **2ª plataforma do caminho** (4,8 / 4 / 116,3), ainda **antes** da pista 3 e da peça de apoio — a ajuda não pula item obrigatório |
| 4 | Nenhuma pista/colecionável obrigatório inalcançável; nenhuma armadilha | ✅ validador de percurso nos 3 estilos (`tests/percurso.test.ts`, agora cobrindo também **amigos, botões e a chegada**) + as 3 partidas completas |
| 5 | Save antigo migra; repetir não duplica recompensa | ✅ `tests/aventuras.test.ts` e `tests/marco2.test.ts` (88 testes no total) |
| 6 | Pontos de Troca em simulação, nenhum resgate real | ✅ teste automático + a tela de resultado mostra o selo **SIMULAÇÃO** |
| 7 | Telas não cortam texto e dá para interagir no celular | ✅ `__fitAll()` e `__fitGame()` em **375×812**: nenhum problema (inclui mapa, cartão da aventura, cartão do Meu Mundo, HUD da A01, HUD do Meu Mundo, pausa, **tela de etapa concluída** e tela de resultado da aventura) |
| 9 | Aventura de duas jogadas: "etapa concluída → próxima etapa" | ✅ medido na A02: concluir a 1ª parte mostrou as três etapas com o que mudou no mundo, os Divertis da etapa e "➡️ Próxima etapa: abra os três cadeados"; o botão **Continuar a aventura** carregou a 2ª parte e guardou as etapas 1 a 3 |
| 8 | Testes do Marco 1 continuam passando | ✅ `npx vitest run` → **88 testes, 6 arquivos, todos passando**; `npx tsc --noEmit` limpo; `npm run build` ok |

**Teste humano (perfis Sara, 4 anos, e Théo, 10 anos): ainda NÃO foi feito.** Nada aqui
substitui isso, e nenhuma linha deste documento afirma que a experiência está aprovada.

## 6. Continuar a aventura sem perder a história

A "partida em andamento" agora guarda **as etapas concluídas, as flags de missão e o estado
de cada amigo**. Antes, continuar uma aventura apagava isso: a criança podia voltar e
encontrar um portão que ela já tinha aberto, fechado de novo.

Medido: jogar até o Beto (3 pistas achadas, Dino ajudado), sair pelo menu, voltar em
"Continuar" → voltou no `cp3` com as etapas 1 e 2, o Dino ajudado, a Bia esperando para
receber as pistas e as 51 moedas já pegas; e **a partida retomada foi concluída até o fim**
(6 etapas, 3 dourados, sala secreta). Os objetos de uma coleta pela metade voltam ao lugar —
decisão consciente, documentada em `DECISOES.md`.

## 7. A ajuda não pula etapa da história

A ajuda "Vamos juntos?" nunca leva a criança para **depois de um portão de missão fechado**:
cada ponto seguro declara de qual missão ele depende (`needsFlag`). Testes em
`tests/marco2.test.ts`.

## 8. Decisões técnicas registradas (reversíveis, não precisam da proprietária)

- **"Bia" é nome provisório** da criança da A01, como os nomes dos amigos de pelúcia.
- **A Fase 1 antiga (`w1_l01`) saiu do mapa**: a A01 é construída sobre ela. O arquivo
  continua no código (base da aventura e dos testes), mas a criança não chega mais lá.
- **Quem já tinha a Fase 1 concluída NÃO ganha a A01 de graça**: a história é nova e precisa
  ser jogada uma vez. Nada se perde — ursinhos, segredos e Divertis antigos continuam.
- **Metas dos baús ajustadas** de 5/12/24 para 4/9/14 estrelas: a campanha agora tem 15
  estrelas no total (antes eram 30 em dez fases), e a meta de 24 era impossível.
- **Os baús passaram a contar as estrelas das aventuras** (as fases antigas já não dão
  estrela de campanha).

## 9. Pendências conhecidas (ditas, não escondidas)

- **A rota de QA da fase antiga `w1_l01` não termina** desde o Marco 2: a personagem quica
  no trampolim e cai de volta na borda da plataforma (o mesmo trecho, já corrigido na A01,
  termina nos três estilos). Como a fase saiu do mapa, isso não afeta a criança — mas, se um
  dia ela voltar, precisa do mesmo ajuste do trampolim.
- **A02–A05 continuam provisórias** (etapas do protótipo). É o Marco 3.
- **Meu Mundo**: colocar e mover peças, expandir o terreno e visitar amigos — Marco 4.
- **Teste com criança**: obrigatório antes de considerar a experiência aprovada.

---

# Revisão de 16/10/2026 — "não dá para passar da primeira fase"

Relato da proprietária: *"primeira fase não está dando para passar, pois não está sendo
encontrado as peças dos ursos para passar para o fim da fase"*. Reproduzido no jogo.
**Eram duas causas somadas**, e as duas são corrigidas aqui.

### R01 — A dica que diz ONDE procurar só era falada depois da missão acabar ✅ 🧪
**Causa encontrada.** No sistema de missões, falar de novo com um amigo com a missão em
andamento devolvia só o texto da missão ("Ache as 2 peças de apoio!"). O campo `hint`,
que é justamente onde está escrito **em que lugar** as coisas estão, só era dito no
agradecimento — ou seja, **depois** de a criança já ter achado tudo. Quem não sabia onde
procurar não tinha como descobrir dentro do jogo.
**Correção** (`QuestSystem.talk`): falar de novo agora diz **quanto falta e onde está**:

> "Ache as 2 peças: ponte de rede e plataformas! Falta 1 de 2. Uma está no meio da ponte
> de rede e a outra no caminho das plataformas, na plataforma verde."

Vale para todas as fases com amigos (Aventura 1 e a fase da Mamãe Ursa).
**Teste novo:** todo amigo que pede missão precisa ter dica e texto de missão escritos.

### R02 — As duas coisas obrigatórias ficavam em cima de uma zona de queda ✅ 🧪
**Causa encontrada.** A pista 3 e a 2ª peça de apoio ficam no **caminho das plataformas**.
Embaixo das plataformas havia uma zona de queda: errar o salto mandava a criança de volta
lá atrás. Como as placas da bifurcação diziam "plataformas **ou** portinha", dava para
jogar o caminho tranquilo inteiro sem nunca passar por esses dois itens — e aí a porta do
recanto (e o fim da aventura) ficava impossível.
**Correção:**
- a zona de queda virou **piscina de bolinhas com dois trampolins de volta**: cair não
  castiga mais, a criança quica e tenta de novo quantas vezes quiser;
- as placas e a mensagem da bifurcação agora dizem que **os dois caminhos têm coisas da
  missão** ("⬅️ Plataformas: 1 pista + 1 peça" / "Portinha: 1 pista ➡️");
- o texto da missão no HUD passou a nomear os lugares.

**Medido depois da correção:** cair no caminho das plataformas deixa a criança na piscina
(**0 quedas contadas**, nenhum recomeço) e o trampolim devolve a **4,4 m na primeira
batida** (as plataformas estão a 4 m), chegando a 10 m se continuar pulando.

**Teste novo:** nenhum item obrigatório de missão pode ficar dentro de uma zona de queda.

### R03 — O validador de percurso não conhecia trampolim ✅
Ao trocar a zona de queda pela piscina, o detector de buracos sem saída acusou
corretamente "buraco de 122 m²" — ele não sabia que **trampolim também é saída**. Agora
sabe: uma área com trampolim só é considerada segura se existir um apoio ao alcance do
quique (trampolim que não leva a lugar nenhum continua sendo armadilha).

### R04 — Último salto da Fase 1 antiga ✅
Mesmo ajuste de trampolim já feito na Aventura 1 (a fase continua no código como base da
aventura). A rota de QA dela volta a terminar: **43,5 s, 0 quedas**.

## Varredura geral do app (16/10)

| Verificação | Resultado |
|---|---|
| Testes automáticos | **96 passando** (6 arquivos) |
| `tsc --noEmit` e `npm run build` | limpos |
| Validador de percurso (10 cenários × 3 estilos) | **0 problemas** — alcance, plataforma isolada e buraco sem saída |
| Corrente das missões (portão → flag → missão) | **0 problemas** em todas as fases 3D |
| Obstrução de visão em todos os checkpoints | **0 enfeites tapando a visão** |
| Aventura 1 inteira, 3 estilos | termina nos três, **0 quedas**, 6 etapas, 3 dourados, sala secreta |
| Fases 3D antigas (l01, l05, l06, l07, l08, l10) | **todas terminam** pelo piloto automático |
| Telas em 375×812 (celular) | **nenhum texto cortado, nenhum botão fora de alcance** |

## Segunda rodada (16/10) — "peguei as peças e a porta não abre"

### R05 — O amigo pedia o que a criança já tinha na mão ✅ 🧪
**Causa encontrada.** As peças de apoio ficam no caminho (a da ponte é pega só de
atravessar). Quem chegava no Robô Beto já com as duas ouvia *"me traga as 2 peças"* e
**nada acontecia**: por dentro ele até ficava pronto para agradecer, mas só entregava na
conversa seguinte — e não havia motivo nenhum para falar com ele de novo.
**Correção:** quando a criança já tem tudo, o amigo recebe na hora. Ele diz o pedido,
e 2 segundos depois agradece e **abre a porta**.
**Medido:** pegar as duas peças → UMA conversa →  ligada e portão aberto.

### R06 — Botões de chão só acendiam depois de conversar ✅
Mesmo defeito, outra forma: na fase da Mamãe Ursa, pisar nos 4 botões antes de falar com
o Robô Beto não acendia nada. Agora o botão de missão acende sempre (a sequência de
memória continua exigindo a ordem certa).

### R07 — Continuar a partida devolvia os objetos já pegos ao lugar ✅
O que já tinha sido pego voltava para o cenário ao continuar: a criança achava que já
tinha feito e o jogo achava que não. Agora a partida salva guarda **o que já foi pego e
os botões acesos**. Medido: pegar a peça da ponte → sair → Continuar → a peça continua
pega.

### R08 — "Onde procurar" e "o que aconteceu depois" eram o mesmo texto ✅
Separados: A sintaxe deste comando :

WHERE [/R dir] [/Q] [/F] [/T] pattern...

DescriÆo:
    Exibe o local de arquivos correspondente ao padrÆo de pesquisa.
    Por padrÆo, a pesquisa  feita no diret¢rio atual e
    nos caminhos especificados pela vari vel de ambiente PATH.

Lista de parmetros:
    /R       Pesquisa recursivamente e exibe os arquivos correspondentes
             ao padrÆo especificado, comeando pelo diret¢rio especificado.

    /Q       Retorna apenas o c¢digo de sa¡da, sem exibir a lista
             de arquivos correspondentes. (Modo silencioso)

    /F       Exibe o nome de arquivo correspondente entre aspas duplas.

    /T       Exibe o tamanho de arquivo, a data e a hora da £ltima modificaÆo
             para todos os arquivos correspondentes.

    padrÆo   Especifica o padrÆo de pesquisa para os arquivos para
             correspondncia. Os caracteres curinga * e ? podem ser usados
             no padrÆo. Os formatos "$env:pattern" e "path:pattern" tambm
             podem ser especificados, em que "env"  uma vari vel de ambiente
             e a pesquisa  feita nos caminhos especificados na vari vel
             de ambiente "env". Esses formatos nÆo devem ser usados
             com /R. A pesquisa tambm  feita acrescentando-se as
             extensäes da vari vel PATHEXT ao padrÆo.

    /?       Exibe esta mensagem de ajuda.

  OBS.: a ferramenta retorna um n¡vel de erro 0 se
        a busca tiver xito, 1 se nÆo tiver xito e
        2 para falhas ou erros.

Exemplos:
    WHERE /?
    WHERE myfilename1 myfile????.*
    WHERE $windir:*.* 
    WHERE /r c:\windows *.exe *.dll *.bat  
    WHERE /Q ??.??? 
    WHERE "c:\windows;c:\windows\system32:*.dll"
    WHERE /f /t *.dll  é dito **durante** a missão (onde estão as coisas) e  **depois**
(a história continua). Antes o Beto repetia o endereço das peças logo depois de recebê-las.

## Checagem do sistema de missões inteiro (16/10)

Cada amigo com missão, jogado nas **duas ordens possíveis** — falar primeiro e depois
pegar, ou pegar primeiro e depois falar:

| Fase | Amigo | Pegar e depois falar | Falar e depois pegar |
|---|---|---|---|
| Aventura 1 | Robô Beto (2 peças) | ✅ porta abre | ✅ porta abre |
| Aventura 1 | Bia (3 pistas) | ✅ | ✅ |
| Aventura 1 | Bia (devolver o ursinho) | ✅ portão da festa abre | ✅ |
| Aventura 1 | Dino Fofo (balão, opcional) | ✅ | ✅ |
| Mamãe Ursa | Dino (3 balões) | ✅ | ✅ |
| Mamãe Ursa | Robô Beto (4 botões) | ✅ *(corrigido em R06)* | ✅ |
| Mamãe Ursa | Pato Quack (3 patinhos) | ✅ sala das almofadas abre | ✅ |

E a Aventura 1 inteira continua terminando: 6 etapas, 0 quedas.
