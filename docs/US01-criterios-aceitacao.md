# US01 — Critérios de aceitação × evidência

História: **US01 – Criar tutorial com base em arquivo JSON** (UC01).
Fonte dos critérios: `UC01 - Criar tutoriais` e seção 12 do plano
`.claude/plano/US01-criar-tutorial-json.md`.

| CA | Descrição | Como é atendido | Evidência |
| --- | --- | --- | --- |
| **CA-1** | O arquivo de configuração deve ser um JSON chamado `index.json`. | `findIndexJson()` usa `workspace.findFiles('**/index.json', '**/node_modules/**')`; escolhe o de menor profundidade e avisa se houver mais de um. Arquivos com outro nome são ignorados. | Unit: `pathUtils.test.ts` (`pickIndexJson`). Integração: `happy.test.ts` (reconhece `index.json`); manifesto com `activationEvents: workspaceContains:**/index.json`. |
| **CA-2** | O `index.json` deve respeitar o JSON Schema. | `TutorialSchemaValidator` (Ajv, draft-07, `allErrors`, `strict:false`) compila `schema/tutorial.schema.json` uma vez e traduz cada erro para PT-BR com caminho JSON Pointer. | Unit: `schemaValidator.test.ts` — 1 fixture válido + 10 inválidos (faltando `title`/`description`/`details`/`backend`; `backend` sem `imageid`; `steps: []`; propriedade extra; `points` string; `file.line = 0`; `step` sem `text`). Cobertura do validador ≈ 91 % (`npm run test:coverage`). |
| **CA-3** | Introdução, etapas e finalização em markdown referenciado. | `ReferenceValidator` verifica a existência de cada `text` (`.md`, erro), de cada `verify`/`background` presente (`.sh`, erro) e de `file.name` presente (aviso, não bloqueia). Ranges apontam para o valor no `index.json`. | Unit: `referenceValidator.test.ts` — `valid-tutorial` (0), `invalid-missing-markdown` (1 erro), `invalid-missing-verify-script` (1 erro), `warn-missing-file-target` (1 aviso). |
| **CA-4** | `index.json` correto ⇒ tutorial disponível para execução. | `LoadResult.ok` ⇒ `TutorialTreeViewProvider` lista raiz (`title`) + um filho por etapa na ordem; `setContext('tutoriais.disponivel', true)`; comando `tutoriais.executar` habilitado via `when`. | Integração: `happy.test.ts` — TreeView com raiz + N etapas, `getLastResult().status === 'ok'`, comando `tutoriais.executar` registrado, sem diagnósticos. |
| **CA-5** | `index.json` incorreto ⇒ aviso indicando o erro. | `TutorialNotifier` chama `window.showWarningMessage('index.json inválido: …', 'Ver detalhes')` (sem repetir erros idênticos); `JsonDiagnostics` publica `Diagnostic`s com range e `source: 'Tutoriais Interativos'` no `index.json`. | Integração: `invalid.test.ts` — `showWarningMessage` chamado, ≥ 1 diagnóstico `Error` com range não nulo, `status === 'invalid'`, TreeView com item "Tutorial inválido". Unit: `jsonSource.test.ts` confere linha/coluna. |
| — | Revalidação ao vivo (plano, item 7). | `TutorialWatcher` observa `**/index.json` e `**/*.{md,sh}` do diretório do tutorial; recarrega com debounce ~200 ms e emite `onDidReload`. | Integração: `reload.test.ts` — cria o markdown que faltava e a TreeView popula / diagnósticos somem sem recarregar a janela. |

## Situação da verificação neste ambiente

- `npm run build`, `npm run lint`, `npm test` (unitários) e `npm run package`: **executados e verdes** localmente (Linux, Node 20).
- `npm run test:integration` (`@vscode/test-electron`): **escritos e ligados ao CI**
  (`.github/workflows/ci.yml`, com `xvfb-run`). Não executáveis nesta máquina de
  desenvolvimento por falta de servidor gráfico e das bibliotecas de sistema do
  VS Code (`libnspr4`, `libnss3`, `libgbm`, …); rodam no runner `ubuntu-latest`.
- T9.1 (smoke Windows/Codespaces) e T9.2 (instalar o `.vsix` num VS Code limpo):
  **pendentes** — dependem de ambientes indisponíveis aqui. O `.vsix` é gerado por
  `npm run package` e publicado como artefato pelo workflow de CI.
