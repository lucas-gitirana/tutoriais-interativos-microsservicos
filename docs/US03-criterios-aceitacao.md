# US03 — Critérios de aceitação × evidência

História: **US03 – Executar tutorial do repositório** (UC03).
Fonte: `casos de uso/.../UC03 - Executar tutoriais ...md`.

| CA | Enunciado | Como é atendido | Evidência |
| --- | --- | --- | --- |
| CA-1 | A visualização do tutorial deve ser uma aba do VSCode com o nome do tutorial e as etapas em sequência. | `TutorialTreeViewProvider` (herdado de US01/US02), sem mudança estrutural nesta história. | Integração `happy.test.ts` (regressão) + `execution.test.ts`. |
| CA-2 | Clicar no play abre a tela de introdução. | `tutoriais.executar` → `iniciarExecucao()` → `TutorialController.start()` → `TutorialWebviewPanel.renderIntro`. | Unit `tutorialController.test.ts`. Integração `execution.test.ts` (`Começar` + título do tutorial no HTML). |
| CA-3 | Clicar em qualquer etapa abre a etapa selecionada. | `item.command` do nó de etapa → `tutoriais.abrirEtapa` → `TutorialController.goToStep(index)`. | Integração `execution.test.ts` (clique direto na etapa 1 sem passar pela 0). |
| CA-4 | Avançar/finalizar etapa atualiza o ícone de check na lista. | `TutorialController.next()` marca `StepStatus.COMPLETED`; `TutorialTreeViewProvider.updateStatuses` reflete no `iconPath`. | Unit `tutorialController.test.ts` (`getProgress`/`statusOf`). Integração `execution.test.ts` (ícone `check` após avançar). |
| CA-5 | Concluir a última etapa abre a tela de finalização. | `next()` na última etapa transiciona para `{ kind: 'finish' }`; `TutorialWebviewPanel.renderFinish`. | Unit `tutorialController.test.ts`. Integração `execution.test.ts` (`tutoriais-summary` no HTML final). |
| CA-6 | Etapa com arquivo/linha específicos ⇒ janela posicionada no arquivo/linha. | `StepExecutor.openStep` → `FileNavigationService.openFile` → `VscodeEditorOpener` (`ViewColumn.Beside`, seleção na linha). | Unit `fileNavigationService.test.ts` (conversão 1-based → 0-based) + `stepExecutor.test.ts`. Integração `execution.test.ts` (editor de `app.py` na linha 11, 0-based de `line: 12`). |
| CA-7 | Clicar num comando no conteúdo da etapa executa no terminal. | `MarkdownRenderer` injeta botão nos fences `bash`/`sh`/`shell`; `webview.js` decodifica e posta `runCommand`; `TerminalService.runCommand` executa via terminal integrado. | Unit `markdownRenderer.test.ts` + `terminalService.test.ts` + `stepExecutor.test.ts`. Integração `execution.test.ts` (`tutoriais-cmd-run` no HTML + comando recebido pelo `TerminalService` fake). |
| RF09 (`background` automático) | `intro.background`/`finish.background` rodam sem clique. | `StepExecutor.openTextBlock` dispara `TerminalService.runCommand` automaticamente quando `background` está presente. | Unit `stepExecutor.test.ts`. Integração `execution.test.ts` (script de `setup.sh` recebido pelo terminal fake ao abrir a introdução). |

## Fora do escopo desta história (não avaliado aqui)

- Interromper a execução (US04, mesma UC03).
- Executar de fato o script `verify`, avaliação de sucesso/falha, pontuação e nota final (UC04, RF11–RF16).
- Provisionamento de ambiente via `backend.imageid`/Docker.

## Suíte automatizada (estado em 2026-09-13)

- `npm test` (unitários): **82 passando**, 0 falhas.
- `npm run lint`: sem avisos/erros.
- `npm run test:integration`: todos os 6 cenários (`happy`, `invalid`, `reload`, `eval-invalid`,
  `eval-warn`, `execution`) terminaram com código de saída 0, incluindo os dois testes do cenário
  `execution` (fluxo feliz completo CA-2–CA-7 e navegação direta CA-3).

## Pendente de validação manual

- Windows (RNF06) e GitHub Codespaces (RNF04/RNF05) — ver `.claude/plano/US03-roteiro-testes.md`,
  cenários C1/C2. Não executados nesta máquina de desenvolvimento (Linux).
