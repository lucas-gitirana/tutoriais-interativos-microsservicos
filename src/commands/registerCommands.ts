import * as vscode from 'vscode';

export interface CommandDeps {
  revalidate: () => Promise<void>;
  iniciarExecucao: () => void;
  abrirEtapa: (index: number) => void;
  interromperTutorial: () => Promise<void>;
}

/**
 * Registra os comandos da extensao:
 *
 * - `tutoriais.executar` — abre a tela de introducao do tutorial.
 * - `tutoriais.revalidar` — re-executa o `TutorialLoader` sob demanda.
 * - `tutoriais.abrirEtapa` — clique numa etapa da TreeView.
 * - `tutoriais.interromper` — interrompe a execucao em curso.
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
