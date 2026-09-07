import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { JsonDiagnostics } from './diagnostics/JsonDiagnostics';
import { TutorialWatcher } from './fs/TutorialWatcher';
import { TutorialLoader } from './loading/TutorialLoader';
import { TutorialSchemaValidator } from './loading/TutorialSchemaValidator';
import { LoadResult } from './loading/types';
import { TutorialNotifier } from './ui/TutorialNotifier';
import { TutorialTreeViewProvider } from './view/TutorialTreeViewProvider';

/** API exposta para os testes de integracao. */
export interface TutorialExtensionApi {
  reload(): Promise<LoadResult>;
  getLastResult(): LoadResult;
  /** Zera o anti-spam do notificador (a extensao pode ter ativado antes do teste). */
  resetNotifier(): void;
  /** Provider da TreeView, para inspecao nos testes. */
  readonly treeProvider: TutorialTreeViewProvider;
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<TutorialExtensionApi> {
  const schemaValidator = new TutorialSchemaValidator();
  const loader = new TutorialLoader(schemaValidator);
  const diagnostics = new JsonDiagnostics();
  const treeProvider = new TutorialTreeViewProvider();
  const notifier = new TutorialNotifier();
  const watcher = new TutorialWatcher(loader);

  const treeView = vscode.window.createTreeView('tutoriaisView', {
    treeDataProvider: treeProvider
  });

  let lastResult: LoadResult = { status: 'none' };

  const applyResult = async (result: LoadResult): Promise<void> => {
    lastResult = result;

    if (result.status === 'invalid') {
      diagnostics.publish(result.indexUri, result.errors);
    } else if (result.status === 'ok') {
      diagnostics.publish(result.indexUri, result.warnings);
    } else {
      diagnostics.clear();
    }

    treeProvider.refresh(result);

    await vscode.commands.executeCommand(
      'setContext',
      'tutoriais.disponivel',
      result.status === 'ok'
    );

    treeView.description =
      result.status === 'ok'
        ? `${result.tutorial.details.steps.length} etapa(s)`
        : undefined;

    await notifier.notify(result);
  };

  const reloadAndApply = async (): Promise<LoadResult> => {
    const result = await watcher.reloadNow();
    await applyResult(result);
    return result;
  };

  context.subscriptions.push(
    treeView,
    diagnostics,
    treeProvider,
    watcher,
    watcher.onDidReload((result) => {
      void applyResult(result);
    }),
    registerCommands({
      revalidate: async () => {
        await reloadAndApply();
      }
    })
  );

  await reloadAndApply();

  return {
    reload: reloadAndApply,
    getLastResult: () => lastResult,
    resetNotifier: () => notifier.reset(),
    treeProvider
  };
}

export function deactivate(): void {
  // Todos os recursos sao liberados via context.subscriptions.
}
