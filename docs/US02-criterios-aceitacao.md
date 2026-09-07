# US02 — Critérios de aceitação × evidência

História: **US02 – Criar avaliações automáticas** (UC02).
Fonte dos critérios: `UC02 - Criar avaliações` e a seção 12 do plano
`.claude/plano/US02-criar-avaliacoes-automaticas.md` (no repositório do TCC).

| CA | Descrição | Como é atendido | Evidência |
| --- | --- | --- | --- |
| **CA-1** | Os scripts de avaliação automática devem ser arquivos bash (extensão `.sh`). | `VerifyScriptValidator` valida cada `step.verify`: extensão `.sh` (erro), shebang bash/sh (ausente ⇒ aviso; não-bash ⇒ erro) e sintaxe via `bash -n` — o script é **analisado, nunca executado** (erro se falhar; aviso se `bash` indisponível, RNF06). O `TutorialLoader` roda essa camada depois do schema e das referências; qualquer erro deixa o tutorial `invalid` (aviso + diagnóstico posicionado no valor de `verify`). | Unit: `verifyScriptValidator.test.ts` — `.py`, sem extensão, shebang `#!/usr/bin/python3`, sem shebang, `bash -n` falho (fake), `bash` indisponível (fake), sintaxe real (`NodeBashSyntaxChecker`). Unit: `evaluationChecks.test.ts` — `runEvaluationChecks` com `invalid-verify-not-sh` ⇒ 1 erro em `/details/steps/0/verify`. Integração: `evaluation.test.ts` cenário `eval-invalid` — `showWarningMessage` citando `.sh`, ≥1 `Diagnostic` `Error` com range, `status === 'invalid'`, TreeView com "Tutorial inválido". |
| **CA-2** | Cada etapa do tutorial pode estar vinculada apenas a um script de avaliação. | O JSON Schema (US01) define `step.verify` como **string única e opcional**: lista/número são rejeitados pelo `type`. Reforço: `checkSingleVerifyKey` percorre a árvore do `index.json` e emite erro quando uma etapa declara `verify` mais de uma vez (JSON aceita chaves repetidas; o parser fica com a última). | Unit: `schemaValidator.test.ts` — `verify-as-array.json` e `verify-as-number.json` ⇒ `error` de tipo em `/details/steps/0/verify`. Unit: `evaluationChecks.test.ts` — etapa com duas chaves `verify` ⇒ 1 `error`; etapa com um `verify` ⇒ `[]`. Fixture `invalid-verify-as-array/` disponível para inspeção manual. |
| RF10 | Vincular uma avaliação automática a um tutorial. | O `verify` de cada etapa é validado e **exibido** na TreeView (rótulo "• avaliação automática"); a carga só fica `ok` com todos os `verify` válidos. | Integração: `happy.test.ts` — os nós de etapa carregam `hasVerify` coerente com `step.verify`. Roteiro manual `US02-roteiro-testes.md` (bloco RF10). |
| RF14 | Atribuir pontuações a cada etapa durante a criação das avaliações. | `points` validado pelo schema (inteiro ≥ 0, US01) + `checkPointsCoherence`: aviso não bloqueante quando `verify` está sem `points` ou `points` sem `verify`. `points` é exibido no rótulo da etapa. A soma / nota final é UC04. | Unit: `evaluationChecks.test.ts` (`checkPointsCoherence`, 4 casos). Integração: `evaluation.test.ts` cenário `eval-warn` — `status === 'ok'`, ≥1 `Diagnostic` `Warning`, nenhum `Error`. |

## Situação da verificação neste ambiente

- `npm run compile-tests`, `npm run lint`, `npm test` (unitários, **50 testes**) e
  `npm run build`: **executados e verdes** localmente (Linux, Node 20). `bash` presente,
  então o teste de sintaxe real (`NodeBashSyntaxChecker`) roda.
- `npm run test:integration` (`@vscode/test-electron`): **escrito e ligado ao CI**
  (`.github/workflows/ci.yml`). Cenários novos `eval-invalid` e `eval-warn` adicionados a
  `src/test/runTest.ts`. Não executável nesta máquina de desenvolvimento por falta de
  servidor gráfico / bibliotecas de sistema do VS Code; roda no runner `ubuntu-latest`.
- Smoke em **Windows sem `bash`** e em **GitHub Codespaces** (roteiro `US02-roteiro-testes.md`,
  cenários C1 e C2): **pendentes** — dependem de ambientes indisponíveis aqui. O comportamento
  esperado (aviso R5 no Windows sem `bash`; paridade no Codespaces via `workspace.fs`) está
  coberto por testes unitários com `BashSyntaxChecker` falso.
