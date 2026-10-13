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
