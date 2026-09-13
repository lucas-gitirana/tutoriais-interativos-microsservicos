import * as vscode from 'vscode';

/** Mensagens que o script do webview (`media/webview.js`) envia para a extensao. */
export type WebviewMessage =
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'runCommand'; command: string };

export interface StepViewData {
  title: string;
  index: number;
  total: number;
  html: string;
}

export interface FinishSummaryItem {
  title: string;
  completed: boolean;
}

/**
 * Painel unico (`vscode.WebviewPanel`) reaproveitado entre as telas do
 * tutorial em execucao: introducao (CA-2), etapa (CA-3) e finalizacao (CA-5).
 *
 * Corresponde a classe `TutorialWebviewPanel` do Diagrama de Classes.
 */
export class TutorialWebviewPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private readonly messageEmitter = new vscode.EventEmitter<WebviewMessage>();
  readonly onDidReceiveMessage = this.messageEmitter.event;
  private subscriptions: vscode.Disposable[] = [];

  constructor(private readonly extensionUri: vscode.Uri) {}

  /** Cria (ou traz para frente) o painel, vinculado ao diretorio do tutorial atual. */
  reveal(tutorialDir: vscode.Uri): vscode.Webview {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One, true);
      return this.panel.webview;
    }
    this.panel = vscode.window.createWebviewPanel(
      'tutoriaisExecucao',
      'Tutorial',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [tutorialDir, mediaRoot(this.extensionUri)]
      }
    );
    this.subscriptions.push(
      this.panel.webview.onDidReceiveMessage((msg: WebviewMessage) =>
        this.messageEmitter.fire(msg)
      ),
      this.panel.onDidDispose(() => {
        this.panel = undefined;
        this.subscriptions.forEach((s) => s.dispose());
        this.subscriptions = [];
      })
    );
    return this.panel.webview;
  }

  /** `true` se o painel estiver aberto no momento. */
  isOpen(): boolean {
    return this.panel !== undefined;
  }

  /** Conteudo HTML atual do painel, para inspecao nos testes de integracao. */
  getHtmlForTests(): string | undefined {
    return this.panel?.webview.html;
  }

  /** Fecha o painel, se aberto (ex.: quando o `index.json` e recarregado em execucao). */
  close(): void {
    this.panel?.dispose();
  }

  renderIntro(tutorialTitle: string, html: string): void {
    this.setHtml(
      tutorialTitle,
      `<article class="tutoriais-content">${html}</article>
       <footer class="tutoriais-nav">
         <button id="btn-next" class="primary">Começar</button>
       </footer>`
    );
  }

  renderStep(data: StepViewData): void {
    const isLast = data.index === data.total - 1;
    this.setHtml(
      `Etapa ${data.index + 1}/${data.total} — ${data.title}`,
      `<article class="tutoriais-content">${data.html}</article>
       <footer class="tutoriais-nav">
         ${data.index > 0 ? '<button id="btn-previous">Voltar</button>' : ''}
         <button id="btn-next" class="primary">${isLast ? 'Concluir tutorial' : 'Avançar'}</button>
       </footer>`
    );
  }

  renderFinish(html: string, summary: FinishSummaryItem[]): void {
    const list = summary
      .map(
        (item) =>
          `<li class="${item.completed ? 'done' : 'pending'}">${item.completed ? '✓' : '○'} ${escapeHtml(
            item.title
          )}</li>`
      )
      .join('');
    this.setHtml(
      'Tutorial concluído',
      `<article class="tutoriais-content">${html}</article>
       <ul class="tutoriais-summary">${list}</ul>`
    );
  }

  dispose(): void {
    this.panel?.dispose();
    this.messageEmitter.dispose();
  }

  private setHtml(title: string, bodyHtml: string): void {
    if (!this.panel) {
      return;
    }
    const webview = this.panel.webview;
    this.panel.title = title;
    const nonce = getNonce();
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaRoot(this.extensionUri), 'webview.css')
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaRoot(this.extensionUri), 'webview.js')
    );
    webview.html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${cssUri}">
<title>${escapeHtml(title)}</title>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${bodyHtml}
<script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }
}

/** Diretorio (em `dist/`, copiado pelo esbuild) onde `webview.css`/`webview.js` ficam. */
function mediaRoot(extensionUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'media');
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
