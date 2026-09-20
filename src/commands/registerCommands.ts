import * as vscode from 'vscode';

export interface CommandDeps {
  /** Dispara uma revalidacao manual do tutorial. */
  revalidate: () => Promise<void>;
  /** Abre a tela de introducao da execucao em curso (CA-2). */
  iniciarExecucao: () => void;
  /** Abre a etapa `index` diretamente, iniciando a execucao se necessario (CA-3). */
  abrirEtapa: (index: number) => void;
  /** Interrompe a execucao em curso, apos confirmacao do usuario (US06). */
  interromperTutorial: () => Promise<void>;
}

/**
 * Registra os comandos da extensao:
 *
 * - `tutoriais.executar` — abre a tela de introducao do tutorial (US03 CA-2).
 * - `tutoriais.revalidar` — re-executa o `TutorialLoader` sob demanda.
 * - `tutoriais.abrirEtapa` — clique numa etapa da TreeView (US03 CA-3).
 * - `tutoriais.interromper` — interrompe a execucao em curso (US06).
 */
export function registerCommands(deps: CommandDeps): vscode.Disposable {
  const executar = vscode.commands.registerCommand('tutoriais.executar', () => {
    deps.iniciarExecucao();
  });

  const revalidar = vscode.commands.registerCommand('tutoriais.revalidar', async () => {
    await deps.revalidate();
  });

  const abrirEtapa = vscode.commands.registerCommand(
    'tutoriais.abrirEtapa',
    (index: number) => {
      deps.abrirEtapa(index);
    }
  );

  const interromper = vscode.commands.registerCommand('tutoriais.interromper', async () => {
    await deps.interromperTutorial();
  });

  return vscode.Disposable.from(executar, revalidar, abrirEtapa, interromper);
}
