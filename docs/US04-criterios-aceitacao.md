# US04 — Critérios de aceitação × evidência

História: **US04 – Executar avaliação automática de etapa**, incluindo o fluxo **US05 – Ignorar
avaliação automática de etapa** (UC04).
Fonte: `casos de uso/.../UC04 - Executar avaliações ...md`.

## US04 — Executar avaliação automática de etapa

| CA | Enunciado | Como é atendido | Evidência |
| --- | --- | --- | --- |
| CA-1 | Script de avaliação vinculado à etapa ⇒ exibe botão para executar a verificação. | `TutorialWebviewPanel.renderStep` inclui o bloco `#btn-verify` quando `step.hasVerify`. | Integração `evaluation-run.test.ts` ("verificação bem-sucedida", checa `id="btn-verify"` no HTML). |
| CA-2 | Após executar, indica se a etapa foi concluída com sucesso ou não. | `EvaluationRunner.verify` roda o script via `VerifyScriptExecutor` (headless); `TutorialController.recordVerificationResult` marca `COMPLETED`/`FAILED`; webview mostra "✓"/"✗". | Unit `evaluationRunner.test.ts`, `tutorialController.test.ts`. Integração `evaluation-run.test.ts` (casos de sucesso e falha). |
| CA-3 | Deve ser possível reexecutar o script ilimitadamente. | Botão "Verificar" nunca fica bloqueado após um resultado; cada clique dispara uma nova chamada ao `EvaluationRunner`. | Integração `evaluation-run.test.ts` ("reexecutar após corrigir atualiza o resultado"). |
| CA-4 | Etapa incorreta ⇒ apresenta o resultado esperado. | `expectedOutput` (stdout+stderr do script na falha, por convenção) exibido no webview dentro de `#verify-result.failure`. | Unit `evaluationRunner.test.ts` (`expectedOutput` presente só na falha). Integração `evaluation-run.test.ts` (mensagem do script fixture no HTML). |

## US05 — Ignorar avaliação automática de etapa

| CA | Enunciado | Como é atendido | Evidência |
| --- | --- | --- | --- |
| CA-1 | Script só executa se o botão de execução for clicado. | `EvaluationRunner.verify` só é chamado pelo handler da mensagem `verify`; `next()`/`goToStep` nunca chamam o executor. | Integração `evaluation-run.test.ts` ("avançar sem verificar" — `executor.calls.length === 0`). |
| CA-2 | Script não executado ⇒ etapa avança sem erros. | `TutorialController.next()` não depende de verificação para navegar; só marca `COMPLETED` automaticamente para etapas **sem** `verify` (comportamento herdado de US03). | Unit `tutorialController.test.ts` ("etapa com verify nunca verificada fica PENDING mesmo após avançar"). Integração `evaluation-run.test.ts`. |

## Requisitos correlatos

| Requisito | Como é atendido | Evidência |
| --- | --- | --- |
| RF15 — nota final | `ScoreTracker.getTotalScore` (soma de `points` das etapas com `verify` bem-sucedido) exibida em `renderFinish`. | Unit `scoreTracker.test.ts`. Integração `evaluation-run.test.ts` ("nota final e resumo"). |
| RF16 — quais etapas concluídas corretamente ou não | `ScoreTracker.getSummary` (4 estados: correta/incorreta/não verificada/sem avaliação) + ícone `error`/`check`/`circle-outline` na TreeView. | Unit `scoreTracker.test.ts`. Integração `evaluation-run.test.ts` (classes `correct`/`incorrect` no HTML da finalização). |

## Fora do escopo desta história (não avaliado aqui)

- Interromper a execução do tutorial (`TutorialController.stop()`), mesma história pendente desde US03.
- Provisionamento de ambiente via `backend.imageid`/Docker.
- Persistência de resultados de verificação entre reinícios do VSCode (estado em memória por sessão).

## Suíte automatizada (estado nesta implementação)

- `npm test` (unitários): **104 passando**, 0 falhas (82 herdados de US01–US03 + 22 novos desta US:
  5 `verifyScriptExecutor`, 6 `evaluationRunner`, 8 casos novos/ajustados em `tutorialController`,
  3 `scoreTracker`).
- `npm run lint`: sem avisos/erros.
- `npm run test:integration`: **não executado nesta sessão** (roda só no CI, conforme diretriz de
  ambiente). Foram escritos/ajustados: `evaluation-run.test.ts` (5 cenários novos: sucesso, falha,
  reexecução, ignorar/US05, nota final e resumo) e `execution.test.ts` (US03), cuja asserção de CA-4
  foi corrigida para refletir que, desde a US04, avançar não marca mais `COMPLETED` automaticamente
  em etapas com `verify` vinculado. Registrado no cenário `evaluation-run` de `runTest.ts`. Pendente de
  rodar no CI para confirmação final.

## Pendente de validação manual

- Todos os cenários do roteiro `.claude/plano/US04-roteiro-testes.md` (CA-1 a CA-4, US05 CA-1/CA-2,
  RF15/RF16) — não executados nesta máquina de desenvolvimento.
- Windows (RNF06, incluindo o cenário de `bash` ausente) e GitHub Codespaces (RNF04/RNF05).
