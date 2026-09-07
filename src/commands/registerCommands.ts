import * as vscode from 'vscode';

export interface CommandDeps {
  /** Dispara uma revalidacao manual do tutorial. */
  revalidate: () => Promise<void>;
}

/**
 * Registra os comandos da extensao:
 *
 * - `tutoriais.executar` — *stub* nesta historia; a execucao real e UC03.
 * - `tutoriais.revalidar` — re-executa o `TutorialLoader` sob demanda.
 */
export function registerCommands(deps: CommandDeps): vscode.Disposable {
  const executar = vscode.commands.registerCommand('tutoriais.executar', () => {
    void vscode.window.showInformationMessage(
      'Execucao do tutorial sera implementada em UC03.'
    );
  });

  const revalidar = vscode.commands.registerCommand('tutoriais.revalidar', async () => {
    await deps.revalidate();
  });

  return vscode.Disposable.from(executar, revalidar);
}
