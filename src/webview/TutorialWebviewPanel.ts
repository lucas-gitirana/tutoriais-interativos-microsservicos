import * as vscode from 'vscode';
import { FinishSummaryItem } from '../evaluation/ScoreTracker';

/** Mensagens que o script do webview (`media/webview.js`) envia para a extensao. */
export type WebviewMessage =
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'runCommand'; command: string }
  | { type: 'verify' };

/** Ultimo resultado de verificacao conhecido da etapa (US04, CA-2/CA-4). */
export interface StepVerificationView {
  success: boolean;
  /** Mensagem de confirmacao (sucesso) ou resultado esperado (falha, CA-4). */
  message: string;
}

export interface StepViewData {
  title: string;
  index: number;
  total: number;
  html: string;
  /** `true` quando a etapa tem script `verify` vinculado (CA-1). */
  hasVerify: boolean;
  /** Ultimo resultado de verificacao desta etapa, se ja verificada. */
  verification?: StepVerificationView;
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
       ${data.hasVerify ? renderVerifyBlock(data.verification) : ''}
       <footer class="tutoriais-nav">
         ${data.index > 0 ? '<button id="btn-previous">Voltar</button>' : ''}
         <button id="btn-next" class="primary">${isLast ? 'Concluir tutorial' : 'Avançar'}</button>
       </footer>`
    );
  }

  renderFinish(
    html: string,
    summary: FinishSummaryItem[],
    score: { total: number; possible: number }
  ): void {
    const list = summary.map((item) => renderSummaryItem(item)).join('');
    const scoreHtml =
      score.possible > 0
        ? `<p class="tutoriais-score">Nota final: <strong>${score.total} / ${score.possible} pontos</strong></p>`
        : '';
    this.setHtml(
      'Tutorial concluído',
      `<article class="tutoriais-content">${html}</article>
       ${scoreHtml}
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

/** Bloco de verificacao automatica da etapa (CA-1, CA-2, CA-4). */
function renderVerifyBlock(verification: StepVerificationView | undefined): string {
  const resultHtml = verification
    ? verification.success
      ? `<div id="verify-result" class="success">✓ Etapa concluída corretamente.</div>`
      : `<div id="verify-result" class="failure">✗ Etapa incorreta.<pre>${escapeHtml(
          verification.message
        )}</pre></div>`
    : '<div id="verify-result" class="hidden"></div>';
  return `<div class="tutoriais-verify">
    <button id="btn-verify">Verificar</button>
    ${resultHtml}
  </div>`;
}

const SUMMARY_MARKERS: Record<FinishSummaryItem['status'], { symbol: string; cssClass: string }> = {
  correct: { symbol: '✓', cssClass: 'correct' },
  incorrect: { symbol: '✗', cssClass: 'incorrect' },
  'not-evaluated': { symbol: '—', cssClass: 'not-evaluated' },
  'no-evaluation': { symbol: '✓', cssClass: 'no-evaluation' }
};

function renderSummaryItem(item: FinishSummaryItem): string {
  const marker = SUMMARY_MARKERS[item.status];
  return `<li class="${marker.cssClass}">${marker.symbol} ${escapeHtml(item.title)}</li>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
