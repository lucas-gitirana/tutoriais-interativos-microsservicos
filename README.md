# Tutoriais Interativos de Microsserviços

Extensão do Visual Studio Code que **detecta, valida e lista** tutoriais
interativos definidos em um arquivo `index.json`, para a plataforma de tutoriais
sobre padrões de microsserviços e observabilidade (TCC de Engenharia de Software —
UDESC).

Reúne as entregas da **US01 – Criar tutorial com base em arquivo JSON** (UC01) e
da **US02 – Criar avaliações automáticas** (UC02). Cobre a etapa de
**autoria/validação**: ao abrir um repositório com um `index.json` válido, o
tutorial aparece numa aba própria na Activity Bar com o título, a lista ordenada
de etapas e, em cada etapa, a indicação da avaliação automática vinculada e da
pontuação. Se o arquivo ou algum script de verificação estiver incorreto, a
extensão mostra um aviso e aponta o erro no painel _Problems_.

## O que já funciona (US01)

| Critério de aceitação | Comportamento |
| --- | --- |
| CA-1 | Detecta um arquivo chamado exatamente `index.json` no workspace. |
| CA-2 | Valida o `index.json` contra o JSON Schema draft-07 do tutorial. |
| CA-3 | Verifica que os markdown de introdução, etapas e finalização existem. |
| CA-4 | `index.json` válido ⇒ tutorial listado na TreeView e disponível para execução. |
| CA-5 | `index.json` inválido ⇒ aviso + diagnósticos com linha/coluna no `index.json`. |
| — | Revalidação ao vivo: alterações no `index.json` ou nos arquivos `.md`/`.sh` recarregam a listagem sem recarregar a janela. |

## O que já funciona (US02)

| Critério de aceitação | Comportamento |
| --- | --- |
| CA-1 | O script de avaliação (`verify`) de cada etapa é validado: extensão `.sh`, shebang bash/sh e sintaxe (`bash -n`, sem executar o script). Violações bloqueiam a disponibilização. |
| CA-2 | Cada etapa admite **um** `verify` — garantido pelo schema (string única) e reforçado pela detecção de `verify` duplicado. |
| RF10 | A avaliação vinculada aparece no rótulo da etapa na TreeView. |
| RF14 | `points` é validado (inteiro ≥ 0) e a extensão avisa quando `verify` e `points` não estão coerentes (um sem o outro). |

## O que **ainda não** funciona (próximas histórias)

- Executar as etapas, abrir arquivos/linha e rodar comandos no terminal — **UC03**.
- **Executar** o script de verificação, mostrar sucesso/falha e a solução esperada — **UC04**.
- Somar a pontuação e mostrar a nota final e o resumo de etapas — **UC04** (RF15/RF16).
- Provisionar o ambiente a partir de `backend.imageid` (Docker) — execução (UC03).
- Catálogo com múltiplos tutoriais e tela de escolha do projeto — **RF01**.
- Análise _semântica profunda_ do que o script verifica (a US02 checa **formato e
  sintaxe**, não a lógica de verificação; não roda `shellcheck`).

O comando **Executar tutorial** aparece quando há um tutorial válido, mas por ora
apenas exibe um aviso de que a execução chega no UC03.

---

## Como autorar um tutorial

### 1. Nome do arquivo

O arquivo de configuração **precisa se chamar `index.json`** e ficar na raiz do
repositório do tutorial. Arquivos com outro nome são ignorados. Havendo mais de
um `index.json` no workspace, a extensão usa o de menor profundidade e registra
um aviso (um tutorial por workspace nesta versão).

### 2. Caminhos são relativos ao `index.json`

Todos os caminhos citados em `text`, `background`, `verify` e `file.name` são
resolvidos **a partir do diretório onde está o `index.json`**, sempre com `/`
como separador (funciona igual em Windows, Linux e GitHub Codespaces).

```
meu-tutorial/
├── index.json
├── intro.md
├── passos/
│   ├── passo-01.md
│   └── verificar-01.sh
└── fim.md
```

No exemplo acima, uma etapa referenciaria `"text": "passos/passo-01.md"`.

### 3. Estrutura do `index.json`

```jsonc
{
  "title": "Implementando o padrão CQRS",          // título exibido
  "description": "Separe leitura e escrita ...",    // resumo curto
  "details": {
    "intro":  { "text": "intro.md" },              // tela de introdução
    "steps":  [ /* 1 ou mais etapas, na ordem */ ],
    "finish": { "text": "finish.md" }              // tela de finalização
  },
  "backend": { "imageid": "org/imagem:tag" }       // ambiente (usado só na execução)
}
```

### 4. Campos

| Campo | Obrigatório | Tipo | Descrição |
| --- | --- | --- | --- |
| `title` | sim | string | Título do tutorial exibido na TreeView. |
| `description` | sim | string | Resumo curto do que o tutorial cobre. |
| `details` | sim | objeto | Contém `intro`, `steps` e `finish`. |
| `details.intro` | sim | _textBlock_ | Tela de introdução. |
| `details.steps` | sim | _step[]_ | Lista ordenada de etapas (**mínimo 1**). |
| `details.finish` | sim | _textBlock_ | Tela de finalização. |
| `backend` | sim | objeto | Configuração do ambiente. |
| `backend.imageid` | sim | string | Identificador da imagem/ambiente a provisionar. |

**_textBlock_** (usado em `intro` e `finish`):

| Campo | Obrigatório | Tipo | Descrição |
| --- | --- | --- | --- |
| `text` | sim | string | Caminho para um arquivo **markdown** com o conteúdo. |
| `background` | não | string | Caminho para um script **shell** executado em segundo plano. |

**_step_** (cada item de `details.steps`):

| Campo | Obrigatório | Tipo | Descrição |
| --- | --- | --- | --- |
| `title` | sim | string | Título da etapa (rótulo na TreeView). |
| `text` | sim | string | Caminho para o **markdown** com as instruções da etapa. |
| `verify` | não | string | Caminho para o **script shell** de verificação (executado no UC03/UC04). |
| `file` | não | objeto | Arquivo a destacar junto da etapa: `{ "name": "caminho", "line": 1 }` (`line` ≥ 1). |
| `points` | não | inteiro ≥ 0 | Pontuação da etapa (usada na avaliação — UC04). |

Regras de validação relevantes (o schema é **estrito**, `additionalProperties: false`):

- propriedades não previstas pelo schema são rejeitadas;
- `details.steps` precisa ter **pelo menos uma** etapa;
- `points` e `file.line` são **inteiros**; `file.line` começa em `1`.

### 5. Exemplo mínimo válido

`index.json`:

```json
{
  "title": "Meu primeiro tutorial",
  "description": "Um tutorial mínimo de exemplo.",
  "details": {
    "intro": { "text": "intro.md" },
    "steps": [
      { "title": "Primeira etapa", "text": "step-01.md" }
    ],
    "finish": { "text": "finish.md" }
  },
  "backend": { "imageid": "exemplo/ambiente:latest" }
}
```

Junto dele: `intro.md`, `step-01.md` e `finish.md`. Abra a pasta no VS Code — o
tutorial aparece na aba **Tutoriais Interativos** da Activity Bar.

Um exemplo completo (padrão CQRS) está em [`examples/tutorial-cqrs/`](examples/tutorial-cqrs/).

---

## Avaliações automáticas (US02)

Cada etapa pode ter **uma** avaliação automática: um script `verify` que confere
se a etapa foi concluída. A execução do script é responsabilidade do UC03/UC04 —
aqui a extensão só **valida** o script no momento da autoria.

### Vincular a avaliação a uma etapa

```jsonc
{
  "title": "Separar comandos de consultas",
  "text": "step-01.md",
  "verify": "verify-step-01.sh",   // um único script .sh, relativo ao index.json
  "points": 10                      // pontuação da etapa (inteiro >= 0)
}
```

### O que é validado no `verify`

| Regra | Resultado se violada |
| --- | --- |
| O caminho termina em **`.sh`** (arquivo bash). | **Erro** — tutorial fica indisponível. |
| A 1ª linha é um **shebang** `#!/usr/bin/env bash` (ou `#!/bin/sh`). | Ausente ⇒ **aviso**; interpretador diferente de bash/sh ⇒ **erro**. |
| A **sintaxe** passa em `bash -n` (o script é analisado, **nunca executado**). | **Erro** com a linha reportada pelo `bash`. |
| `bash` disponível no ambiente. | Indisponível (ex.: Windows sem Git Bash) ⇒ **aviso**; a checagem de sintaxe completa ocorre em Linux/Codespaces. |

As mesmas checagens valem para `background` (setup de `intro`/`finish`), porém
sempre como **aviso** — `background` não é script de avaliação.

### Uma avaliação por etapa

`verify` é **uma string**: uma lista (`["a.sh", "b.sh"]`) ou uma etapa com a
propriedade `verify` repetida são rejeitadas.

### Pontuação (`points`)

`points` é um inteiro ≥ 0. A extensão avisa quando `verify` e `points` não andam
juntos: etapa com `verify` e sem `points`, ou com `points` e sem `verify`. A
**soma** dos pontos e a **nota final** aparecem só na execução (UC04).

---

## Desenvolvimento

```bash
npm install
npm run build            # bundle esbuild -> dist/extension.js
npm run lint
npm test                 # testes unitários (Ajv, parser posicional, referências)
npm run test:integration # testes de integração (@vscode/test-electron)
npm run package          # gera o .vsix
```

Pressione **F5** no VS Code para abrir o _Extension Development Host_ já com o
tutorial de exemplo carregado.

### Rodando os testes de integração

`@vscode/test-electron` baixa um VS Code real e o executa. Em Linux isso exige
algumas bibliotecas de sistema e um servidor gráfico. Numa máquina headless
(inclusive WSL) instale, **uma vez**:

```bash
sudo apt-get update && sudo apt-get install -y \
  xvfb libnss3 libnspr4 libasound2t64 libgbm1 libdrm2 libxkbcommon0 \
  libgtk-3-0t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 \
  libatspi2.0-0t64 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libxshmfence1 libpango-1.0-0 libcairo2 libx11-xcb1
```

Depois basta `npm run test:integration` — se não houver `DISPLAY`, o runner se
reexecuta automaticamente sob `xvfb-run`. (Os nomes de pacote acima são de
Ubuntu 24.04 "noble"; em versões anteriores use `libasound2`, `libgtk-3-0`,
`libatk1.0-0`, `libatk-bridge2.0-0`, `libcups2`, `libatspi2.0-0` sem o sufixo
`t64`.) No CI isso já é feito pelo workflow.

### Arquitetura (alinhada ao Diagrama de Classes do TCC)

| Módulo | Papel |
| --- | --- |
| `src/model/tutorial.ts` | Interfaces do modelo (`TutorialDefinition`, `TutorialDetails`, `TextBlock`, `Step`, `FileTarget`, `BackendConfig`). |
| `src/loading/TutorialSchemaValidator.ts` | Validação contra o JSON Schema draft-07 (Ajv). |
| `src/loading/JsonSource.ts` | Parser posicional (`jsonc-parser`): mapeia caminho → linha/coluna. |
| `src/loading/ReferenceValidator.ts` | Existência dos `.md` / `.sh` / `file.name` (parte de existência do `VerifyScriptValidator`). |
| `src/loading/VerifyScriptValidator.ts` | Formato e validade do `verify`: `.sh`, shebang, `bash -n` (US02). |
| `src/loading/EvaluationChecks.ts` | Coerência `verify`↔`points` (RF14), `verify` único por etapa (CA-2) e orquestração da camada US02. |
| `src/fs/ScriptReader.ts` / `BashSyntaxChecker.ts` | Leitura do conteúdo do script e checagem de sintaxe (`bash -n`), com implementações Node e VS Code. |
| `src/loading/TutorialLoader.ts` | Orquestra descoberta → parse → schema → referências → scripts de avaliação → `LoadResult`. |
| `src/fs/workspace.ts` / `TutorialWatcher.ts` | Descoberta do `index.json`, resolução de caminhos e revalidação ao vivo. |
| `src/diagnostics/JsonDiagnostics.ts` | `DiagnosticCollection` do `index.json`. |
| `src/view/TutorialTreeViewProvider.ts` | TreeView com título + etapas (com avaliação vinculada e pontuação). |
| `src/extension.ts` | Ativação e fio condutor. |

## Licença

MIT — veja [LICENSE](LICENSE).
