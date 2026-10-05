# Divertiland — O Mundo da Diversão 🎪

Jogo infantil 3D da marca Divertiland, com os mascotes **Jhow** e **Mina**.
Roda no navegador (computador, tablet e celular) e está preparado para virar aplicativo.

> **Estado atual:** Mundo 1 completo e jogável — 10 fases + 1 fase secreta, loja, guarda-roupa,
> perfis, estrelas, Divertis, baús e conquistas. Arte, personagens e sons ainda são
> **provisórios** (placeholders), prontos para serem trocados pelo material real.

## Como abrir o jogo (computador)

Precisa do [Node.js](https://nodejs.org) instalado (versão 20 ou mais nova).

```bash
npm install
```

```bash
npm run dev
```

Depois abra o endereço que aparecer (normalmente `http://localhost:5173`).
Para testar no celular na mesma rede Wi-Fi, use o endereço "Network" que aparece no terminal.

## Controles

| Ação | Computador | Celular/tablet |
|---|---|---|
| Andar | WASD ou setas | joystick (lado esquerdo da tela) |
| Correr | Shift | empurrar o joystick até o fim |
| Pular | Espaço | botão verde ⬆ |
| Olhar em volta | arrastar com o mouse | arrastar no lado direito da tela |
| Interagir / conversar | E | botão ✋ que aparece |
| Pausar | Esc ou P | botão ⏸ |
| Corrida (fase 3) | ⬅️ ➡️ trocar faixa, ⬆️ pular, ⬇️ abaixar | deslizar o dedo |

Controle de videogame (gamepad) também funciona.

## As fases do Mundo 1

| # | Fase | Tipo de brincadeira | Habilidade (interna) |
|---|---|---|---|
| 1 | Bem-vindo à Divertiland | Exploração 3D + tutorial | orientação espacial, coordenação |
| 2 | Cadê o Brinquedo? | Objetos escondidos | observação, atenção |
| 3 | Corredor Maluco | Corrida (runner) | atenção, coordenação |
| 4 | Porta Misteriosa | Quebra-cabeças (memória, formas, padrões) | lógica, memória |
| 5 | Circuito das Redes | Parkour de obstáculos | coordenação, persistência |
| 6 | Caça aos Divertis | Plataforma 2D (de lado) | observação, planejamento |
| 7 | Trampolim nas Alturas | Trampolim | coordenação |
| 8 | O Chão é Lava! | Parkour especial | planejamento |
| 9 | O Ursinho Perdido | Aventura com história e missões | empatia, decisão |
| 10 | Super Desafio Divertiland | Fase bônus que mistura tudo | persistência |
| ★ | Pega-Pega Secreto | Pega-pega (fase secreta) | orientação espacial |

A ordem foi pensada para que **a fase seguinte nunca seja igual à anterior**.

## Para quem for programar

```bash
npm test          # testes automáticos (regras, save, física)
npm run typecheck # checagem de tipos
npm run build     # versão final em dist/
```

- **Ferramentas de desenvolvimento** (só no modo `npm run dev`): tecla **F2** abre o painel
  (escolher fase, ganhar Divertis, liberar tudo, ir a checkpoints, ver colisões, FPS, apagar save).
- **Teste automático das fases 3D**: no console do navegador, `await __qaAll()` joga todas as fases
  com um piloto automático e mostra se foram concluídas.
- Documentação técnica: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md),
  decisões: [`docs/DECISOES.md`](docs/DECISOES.md), próximos passos: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Site publicado

O jogo está no ar em **https://newtech-system.github.io/divertiland/**
(código em https://github.com/newtech-system/divertiland).

Para publicar uma versão nova depois de mudanças:

```bash
npm run deploy
```

Isso gera a versão final e envia para o ramo `gh-pages`; o GitHub Pages atualiza o site em 1–2 minutos.
Para usar um domínio próprio no futuro (ex.: divertiland.com.br), basta configurá-lo em
*Settings → Pages* do repositório e apontar o DNS do domínio para o GitHub.
