# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

Extensão do VS Code (TCC de Engenharia de Software, UDESC) que detecta, valida, lista e executa tutoriais interativos sobre microsserviços definidos em um `index.json`. Código, comentários, mensagens e docs são em **português** — mantenha o idioma. O trabalho é organizado por User Stories/Casos de Uso (US01–US06, UC01–UC04); commits seguem `feat(usNN): descrição (UCnn)` e cada história vive em uma branch `feat-USNN-...`. O [README.md](README.md) documenta o formato do `index.json`, as convenções de `verify` e o que cada US entrega.

## Comandos

```bash
npm run build              # esbuild -> dist/extension.js (também copia schema e src/webview/media para dist/)
npm run watch              # esbuild em modo watch
npm run lint               # eslint src --ext ts
npm test                   # hook pretest (tsc + build + lint) e depois mocha em out/test/unit/**/*.test.js (sem VS Code)
npm run test:coverage      # c8 sobre out/loading e out/fs
npm run test:integration   # @vscode/test-electron: baixa e roda um VS Code real (src/test/suite); sem DISPLAY use `xvfb-run -a`
npm run test:all           # unitários + integração
npm run package            # vsce package -> .vsix
```

- Testes rodam a partir de `out/` (saída do `tsc`), não de `src/`. Para um único arquivo: `npm run compile-tests && npx mocha out/test/unit/<nome>.test.js` (ou `-g "<padrão>"`); isso pula o lint/build do `pretest`.
- CI (`.github/workflows/ci.yml`, Node 20): lint → testes unitários → integração sob xvfb → `vsce package`.
- F5 abre o Extension Development Host (`.vscode/launch.json`).

## Arquitetura

Fluxo de carga (`src/loading/TutorialLoader.ts` orquestra): descoberta do `index.json` (`fs/workspace.ts`, usa o de menor profundidade) → parse posicional com `jsonc-parser` (`JsonSource`, mapeia caminho JSON → linha/coluna para diagnósticos) → schema Ajv draft-07 (`schema/tutorial.schema.json`, estrito) → existência de referências `.md`/`.sh`/`file.name` (`ReferenceValidator`) → validação dos scripts (`VerifyScriptValidator`/`EvaluationChecks`: `.sh`, shebang, `bash -n` sem executar, coerência `verify`↔`points`) → `LoadResult` (`status: 'ok' | 'invalid' | 'none'`, com issues de severidade erro/aviso). Erro bloqueia a disponibilização; aviso não. `TutorialWatcher` revalida ao vivo quando `index.json`, `.md` ou `.sh` mudam.

Execução (US03+): `src/extension.ts` é o fio condutor e liga tudo. `TutorialController` (`src/controller`) é a máquina de estados da execução (start/next/previous/goToStep, status por etapa, `recordVerificationResult`); a `TreeView` (`src/view`) e o `TutorialWebviewPanel` (`src/webview`, HTML + assets em `src/webview/media/`, comunicação por mensagens) reagem às mudanças do controller. O markdown das etapas vira HTML em `src/markdown/MarkdownRenderer.ts` (markdown-it, `html: false`), que resolve imagens via callback injetado e transforma blocos `bash`/`sh`/`shell` em botões "▶ Executar" (`data-command-b64`) que o webview devolve como mensagem para rodar no terminal. `src/execution` abre arquivo/linha (`FileNavigationService`), roda comandos no terminal integrado (`TerminalService`) e coordena isso por etapa (`StepExecutor`). `src/evaluation` executa o `verify` de verdade via `child_process` (`NodeVerifyScriptExecutor` → `EvaluationRunner` → `VerificationResult`) e calcula nota/resumo (`ScoreTracker`). Regra de negócio: etapa com `verify` só é marcada concluída quando a verificação passa; o script nunca roda sem clique em Verificar.

Padrão de testabilidade: tudo que toca a API do VS Code ou o sistema fica atrás de interface com implementação `Node*` (unitária/headless) e `Vscode*` (real): `FileProbe`, `ScriptReader`, `VerifyScriptExecutor`, `TerminalFactory`, `EditorOpener`. Testes unitários (`src/test/unit`, sem importar `vscode`) usam as versões Node ou fakes; `activate()` devolve uma `TutorialExtensionApi` (setters como `setTerminalService`/`setVerifyScriptExecutor`, `simulateWebviewMessage`) para os testes de integração injetarem fakes e simularem o webview. Testes de integração ficam em `src/test/suite` (com `harness.ts` comum). Mantenha código de `loading/`, `fs/` (parte Node), `evaluation/`, `controller/` e `markdown/` livre de `import 'vscode'` para continuar testável em mocha puro.

Fixtures de teste ficam em `src/test/fixtures/` (`valid-tutorial`, `invalid-*`, `warn-*`, `schema-invalid/*.json`); `examples/tutorial-cqrs/` é o tutorial de exemplo completo.

Contribuições em `package.json`: comandos `tutoriais.executar|revalidar|interromper`, context keys `tutoriais.disponivel` e `tutoriais.emExecucao` controlam a visibilidade dos botões da view `tutoriaisView`.
