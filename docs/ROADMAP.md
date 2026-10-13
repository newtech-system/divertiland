# Roteiro (milestones)

## ✅ Etapa 1 — Fundação
Input, save versionado com backup, perfis, progressão, Divertis, estrelas, níveis, dificuldade, UI base.

## ✅ Etapa 2 — Vertical slice
Título → perfil → mapa → Fase 1 (3D) → estrelas/Divertis → resultado → desbloqueio → loja →
comprar → equipar → salvar → reabrir mantendo tudo.

## ✅ Etapa 3 — Variedade (Mundo 1 completo)
Objetos escondidos, corrida, puzzles, parkour, plataforma 2D, trampolim, chão é lava, narrativa com
missões, fase bônus e fase secreta de pega-pega. Baús por estrelas, conquistas, área dos pais.

## ⏭️ Próximos passos sugeridos
1. **Material real da Divertiland**: fotos/vídeos/GoPro → cenários das fases; arte final dos mascotes.
2. **Modelos finais do Jhow e da Mina** (rig único + conjunto completo de animações).
3. **Áudio real**: trilha por mundo, efeitos e vozes (dublagem).
4. **Teste com crianças** (2–3 por estilo de aventura) para balancear tempo, dificuldade e economia.
5. **App para celular/tablet** (Capacitor ou PWA instalável) e testes em aparelhos intermediários.
6. **Mundo 2** (novo setor temático) usando os mesmos tipos de fase + novos itens/coleções.
7. Conta/nuvem opcional (adaptador de armazenamento já preparado).

## Riscos conhecidos
- Desempenho em celulares muito antigos: há opção "Gráficos: Leve"; precisa medir em aparelhos reais.
- Narração depende de existir voz em português instalada no aparelho (senão fica só o texto + ícones).
- Personagens provisórios: a troca pelo modelo final exige seguir o pipeline de rig (ver ARQUITETURA).

---

## Prompt Mestre V2 (7/10/2026) — cinco aventuras + Meu Mundo

### ✅ Marco 1 — Auditoria e fundação
Backlog rastreável B01–B40 em `docs/BACKLOG.md`, com estado e evidência de cada item.
Corrigidos: moedas que somem (B01), andar na lava (B34), frente/trás e pulo (B06), ficar
preso (B05), assistência real do Bicho-Preguiça (B09), abaixar na corrida (B22), placas e
bandeiras tapando a visão (B07/B08), enfeite que parece prêmio (B03/B33).
Ferramentas novas: área de teste de movimento, validador de percurso (itens fora de
alcance, plataformas isoladas, buracos sem saída), verificador de obstrução de câmera e
de texto cortado.

### 🚧 Marco 2 — Modelo das aventuras e a A01 completa
**Feito:** modelo de dados das cinco aventuras (etapas internas, 15 estrelas, 15 ursinhos
de id permanente, aprendizado vivido), dois saldos separados, livro-caixa com chave de
idempotência, migração do save v1→v2 (dez fases → cinco aventuras, sem pagar de novo nem
apagar nada), conquistas revisadas com patentes, mecânica de etapas internas e de missão
em duas partes.

**Falta:** o conteúdo da A01 (`src/data/levels/a01.ts` com os seis trechos da seção 9: a
criança triste, as três pistas, o mecanismo do caminho, a devolução do ursinho e a sala
secreta), o mapa mostrando as cinco aventuras + a entrada do Meu Mundo, o fluxo de
"etapa concluída → próxima etapa" nas telas, e o terreno mínimo do Meu Mundo.

### ⏭️ Marcos 3 a 6
A02–A05 com conteúdo próprio, Meu Mundo completo com visitas assíncronas, economia e
operação presencial em ambiente de teste, acabamento com arte e voz definitivas.
