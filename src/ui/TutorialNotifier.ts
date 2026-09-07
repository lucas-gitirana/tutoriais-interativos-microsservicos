import * as vscode from 'vscode';
import { LoadResult, ValidationError } from '../loading/types';

/**
 * Traduz um {@link LoadResult} em feedback ao professor (CA-5):
 *
 * - `invalid` -> `showWarningMessage` com o resumo do primeiro erro e acao
 *   "Ver detalhes" (abre o `index.json` e foca o painel Problems);
 * - `ok` vindo de um estado `invalid` -> mensagem breve na status bar.
 *
 * Evita spam: nao repete a notificacao se a "assinatura" dos erros for igual a
 * da ultima carga.
 */
export class TutorialNotifier {
  private lastSignature: string | undefined;
  private lastStatus: LoadResult['status'] | undefined;

  async notify(result: LoadResult): Promise<void> {
    const signature = signatureOf(result);
    const previousStatus = this.lastStatus;
    const repeated = signature === this.lastSignature;
    this.lastSignature = signature;
    this.lastStatus = result.status;

    if (result.status === 'invalid') {
      if (repeated) {
        return;
      }
      const first = result.errors[0];
      const resumo = first ? first.message : 'formato invalido.';
      const escolha = await vscode.window.showWarningMessage(
        `index.json invalido: ${resumo}`,
        'Ver detalhes'
      );
      if (escolha === 'Ver detalhes') {
        await vscode.window.showTextDocument(result.indexUri);
        await vscode.commands.executeCommand('workbench.actions.view.problems');
      }
      return;
    }

    if (result.status === 'ok' && previousStatus === 'invalid') {
      vscode.window.setStatusBarMessage('Tutorial carregado ✓', 3000);
    }
  }

  /** Reseta o estado de anti-spam (util em testes / ao trocar de workspace). */
  reset(): void {
    this.lastSignature = undefined;
    this.lastStatus = undefined;
  }
}

function signatureOf(result: LoadResult): string {
  if (result.status !== 'invalid') {
    return result.status;
  }
  return 'invalid:' + result.errors.map(keyOf).join('|');
}

function keyOf(err: ValidationError): string {
  return `${err.severity}@${err.path}:${err.message}`;
}
