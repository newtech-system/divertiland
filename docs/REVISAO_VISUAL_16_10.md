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

## 5. Pendências declaradas (não implementadas nesta rodada)

Nada abaixo está feito; está listado para não ser confundido com entregue.

1. **Personagens oficiais em 3D** (V01). A prancha foi examinada e o figurino está
   descrito abaixo, mas o personagem que anda ainda é o modelo procedural atual.
   Falta: modelo, materiais, rig e animações fiéis; PNGs de corpo inteiro e rostos.
2. **Ambientes baseados nas fotos** (V02). A Aventura 1 continua com o cenário de blocos.
   Falta: estrutura verde com barras acolchoadas e redes pretas, escorregadores azul e
   amarelo, tubo verde, murais de planetas/astronauta, piso claro brilhante, teto escuro.
3. **Tela de apresentação da aventura** (5.3): 8–15 s com demonstração, "Vamos brincar",
   "Ouvir de novo" e "Pular explicação". Hoje a instrução ainda chega por falas no HUD —
   por isso duas falas longas precisaram de quatro linhas até eu encurtá-las.
4. **Caça a objetos em cena frontal** (A02 / V08), memória com Ouça/Observe/Sua vez,
   corrida, circuito e pega-pega refeitos.
5. **"Quem é o Travesso?"** (A06) e Meu Mundo construível.
6. **Voz**: só falas escritas e leitura do aparelho; nenhum áudio final.
7. **Teste com criança** (V06): continua sendo o teste que vale, e não aconteceu.
8. **Desempenho medido** (V17) em aparelho intermediário real: não medido.

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
