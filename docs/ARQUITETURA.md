# Arquitetura do Divertiland

## Visão geral

```
src/
  core/        GameManager (estados e loop), EventBus, Logger, tipos
  data/        TUDO que é conteúdo e balanceamento (fases, itens, economia, dificuldade, conquistas)
    levels/    dados de cada fase (w1_l01.ts ... w1_s01.ts)
  systems/     regras do jogo SEM gráficos (testáveis): save, perfis, Divertis, estrelas,
               progressão, loja, inventário, customização, conquistas, conclusão de fase
  engine/      motor visual: renderizador, física, personagem, câmera, partículas, props, materiais
  levels/      "runtimes" de cada tipo de gameplay + registro de fases
    exploration/  motor 3D (exploração, parkour, trampolim, lava, 2D de lado, narrativa, pega-pega)
    hidden/       objetos escondidos
    runner/       corrida
    puzzle/       quebra-cabeças
  ui/          telas (HTML/CSS): título, perfis, mapa, HUD, loja, resultados, ajustes
  audio/       AudioManager (efeitos e músicas sintetizados), Narrator (voz)
  input/       InputManager (teclado, mouse, toque, gamepad → ações)
  dev/         ferramentas de desenvolvimento e rotas de QA (não vão para a versão final)
tests/         testes automáticos (Vitest)
```

## Sistemas pedidos × onde estão

| Sistema | Arquivo |
|---|---|
| GameManager | `core/GameManager.ts` |
| PlayerController / CharacterController | `engine/character/CharacterController.ts` (+ `engine/physics/CharacterBody.ts`) |
| CameraController | `engine/CameraController.ts` (3ª pessoa) e câmera lateral em `Exploration3DLevel` |
| AnimationController | `engine/character/AnimationController.ts` (interface `CharacterAnimator`) |
| LevelManager / LevelData | `levels/registry.ts`, `data/levelTypes.ts`, `data/worlds.ts`, `data/levels/*` |
| DifficultyManager | `data/difficulty.ts` (parâmetros por estilo de aventura) |
| CurrencyManager | `systems/CurrencyManager.ts` |
| StarManager | `systems/StarManager.ts` |
| SaveManager | `systems/save/*` |
| InventoryManager / CustomizationManager / ShopManager | `systems/*Manager.ts` |
| QuestManager | `levels/exploration/QuestSystem.ts` |
| CheckpointManager | `levels/exploration/CheckpointManager.ts` |
| CollectibleSystem | `levels/exploration/CollectibleSystem.ts` |
| AchievementSystem | `systems/AchievementSystem.ts` |
| AudioManager | `audio/AudioManager.ts` |
| UIManager | `ui/UIManager.ts` |
| InputManager | `input/InputManager.ts` |

## Ciclo principal

```
Título → Perfil → Mapa → Cartão da fase (escolhe 🦥🐒🐆) → Fase → Resultado → Mapa → Loja → ...
```

1. A fase (qualquer tipo) implementa `LevelRuntime` e, ao terminar, entrega um `LevelRunResult`.
2. `LevelCompletionService` calcula estrelas, Divertis, desbloqueios, itens e conquistas — e salva.
3. O mapa mostra os novos estados (`LOCKED`, `AVAILABLE`, `IN_PROGRESS`, `COMPLETED`).

## Conteúdo por dados (como adicionar coisas sem mexer no motor)

- **Nova fase de um tipo existente:** crie `src/data/levels/w1_xx.ts` (lista de entidades:
  plataformas, moedas, trampolins, redes, martelos, amigos com missões...), adicione a fase em
  `data/worlds.ts` (nome, ícone, objetivos de estrela, regra de desbloqueio, posição no mapa) e
  uma linha em `levels/registry.ts`.
- **Novo item da loja:** uma linha em `data/items.ts` (preço, categoria, slot, cores, coleção).
- **Economia:** só em `data/economy.ts`.
- **Dificuldade:** `data/difficulty.ts` (cada fase pode sobrescrever valores).
- **Conquistas:** `data/achievements.ts`.
- **Novo mundo:** outro bloco em `WORLDS` (`data/worlds.ts`) com suas fases e baús.

## Trocar placeholders pelo material real

- **Personagens (Jhow/Mina):** hoje são montados com formas simples em `CharacterModel.ts`, com a
  mesma hierarquia de "ossos" (`hips, spine, head, armL, armR, legL, legR`) e pontos de encaixe de
  itens. Quando o GLB final existir: 1) definir o rig, 2) validar o esqueleto, 3) gerar todas as
  animações no MESMO rig, 4) criar um animador com `THREE.AnimationMixer` que implemente a interface
  `CharacterAnimator`. O gameplay não muda (física e animação são separadas).
- **Cenários reais (fotos/GoPro):** cada entidade de fase aceita `model` (arquivo 3D) no lugar do
  visual provisório; colisões e gatilhos continuam os mesmos.
- **Itens:** `ItemVisual.modelUrl` permite usar modelo 3D por item.
- **Sons e músicas:** `AudioManager.registerSample(id, url)` troca qualquer efeito sintetizado por um
  arquivo real (mantém o sintetizado como reserva). Músicas: `audio/musicData.ts`.
- **Vozes:** hoje a narração usa a voz do próprio aparelho (`Narrator.ts`), só vozes locais
  (privacidade). Pode ser trocada por falas gravadas do Jhow e da Mina.

## Save (progresso)

- Formato versionado (`SAVE_VERSION`) com migrações em `SaveSchema.ts`.
- Cada campo é validado; valor inválido vira padrão — o save nunca é descartado por um erro.
- Checksum detecta arquivo corrompido; existe **backup** do último save bom e cópia do corrompido.
- Proteções contra perda: não grava antes de carregar; nunca troca um backup com perfis por um
  save vazio; recupera automaticamente do backup se o principal ficar vazio sem querer.
- Armazenamento pela interface `StorageAdapter` (hoje `localStorage`). Para nuvem/conta, basta
  criar um adaptador novo — nada mais muda.

## Desempenho

Um único contexto WebGL; geometria parada agrupada em poucas malhas por material; moedas e bolinhas
com `InstancedMesh`; partículas com limite fixo; materiais em cache; fases carregadas sob demanda;
qualidade gráfica ajustável (resolução) nos Ajustes; física própria leve (caixas, rampas, cilindros).

## Testes

- `npm test`: regras do jogo, save (incluindo recuperação de perda), física.
- No navegador (modo dev): `await __qaAll()` joga as fases 3D com piloto automático nos 3 estilos.

## Encaixe na tela (celulares)

O jogo precisa caber inteiro em qualquer tela, sem botões escondidos:

- **`src/ui/viewport.ts`** mede a área REALMENTE visível (`visualViewport` quando existe, senão
  `innerWidth/innerHeight`) e publica `--app-w`, `--app-h` e `--app-min` em CSS. Em celular não dá
  para confiar em `100vh`: a barra do navegador fica por cima, o teclado abre, a tela gira.
  A medida é reavaliada por `resize`, `orientationchange`, `visualViewport`, `ResizeObserver` e,
  por garantia, por uma checagem periódica no laço do jogo (`pollViewport`).
- **`#app` usa `--app-w`/`--app-h`** e o renderizador 3D usa as mesmas medidas, então canvas e
  interface sempre coincidem com o que aparece.
- **Tamanhos proporcionais:** botões, títulos, retratos, HUD e painéis usam `clamp()` em função de
  `--app-h`/`--app-min`, com um mínimo confortável para dedos de criança (44 px).
- **Classes de tamanho no `<body>`:** `short` (tela baixa), `tiny` (muito baixa), `narrow`
  (estreita) e `em-pe` (celular em pé) deixam a interface mais compacta quando necessário.
  (O nome é `em-pe` e não `portrait` para não colidir com a classe `.portrait` dos retratos.)
- **Rede de segurança:** telas de conteúdo (título, criação de perfil, perfis, resultados) têm
  `.scrollable`, então mesmo num caso extremo nada fica inalcançável. As áreas roláveis declaram
  `touch-action` (o resto da página bloqueia gestos para o dedo não arrastar a tela durante a fase).
- **Câmera 3D:** com a tela em pé o campo de visão abre, para a criança enxergar o caminho.

### Como testar

No modo `npm run dev`, no console do navegador:

```js
await __fitAll()   // percorre os menus e lista botões cortados/escondidos/pequenos demais
await __fitGame()  // o mesmo dentro das fases (HUD, controles de toque e painéis)
```

Tamanhos já verificados sem nenhum problema: 280×653, 320×568, 360×640, 390×844, 568×320,
640×360, 768×1024, 844×390 e 1280×800.
