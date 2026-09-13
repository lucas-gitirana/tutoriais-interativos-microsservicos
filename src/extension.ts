import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { TutorialController } from './controller/TutorialController';
import { StepStatus } from './controller/types';
import { JsonDiagnostics } from './diagnostics/JsonDiagnostics';
import { EvaluationRunner } from './evaluation/EvaluationRunner';
import { NodeVerifyScriptExecutor } from './evaluation/NodeVerifyScriptExecutor';
import { getSummary, getTotalScore } from './evaluation/ScoreTracker';
import { VerificationResult } from './evaluation/types';
import { VerifyScriptExecutor } from './evaluation/VerifyScriptExecutor';
import { FileNavigationService } from './execution/FileNavigationService';
import { StepExecutor } from './execution/StepExecutor';
import { TerminalService } from './execution/TerminalService';
import { VscodeEditorOpener } from './execution/VscodeEditorOpener';
import { VscodeTerminalFactory } from './execution/VscodeTerminalFactory';
import { dirOf } from './fs/workspace';
import { VscodeScriptReader } from './fs/VscodeScriptReader';
import { TutorialWatcher } from './fs/TutorialWatcher';
import { TutorialLoader } from './loading/TutorialLoader';
import { TutorialSchemaValidator } from './loading/TutorialSchemaValidator';
import { LoadResult } from './loading/types';
import { MarkdownRenderer } from './markdown/MarkdownRenderer';
import { TutorialNotifier } from './ui/TutorialNotifier';
import { TutorialTreeViewProvider } from './view/TutorialTreeViewProvider';
import { TutorialWebviewPanel, WebviewMessage } from './webview/TutorialWebviewPanel';

/** API exposta para os testes de integracao. */
export interface TutorialExtensionApi {
  reload(): Promise<LoadResult>;
  getLastResult(): LoadResult;
  /** Zera o anti-spam do notificador (a extensao pode ter ativado antes do teste). */
  resetNotifier(): void;
  /** Provider da TreeView, para inspecao nos testes. */
  readonly treeProvider: TutorialTreeViewProvider;
  /** Painel de execucao do tutorial (US03), para inspecao nos testes. */
  readonly webviewPanel: TutorialWebviewPanel;
  /** Controller da execucao em curso, se {@link iniciarExecucao}/{@link abrirEtapa} ja tiver sido chamado. */
  getController(): TutorialController | undefined;
  /** Injeta um `TerminalService` (ex.: fake) para os testes de integracao. */
  setTerminalService(service: TerminalService): void;
  /**
   * Simula uma mensagem vinda do webview (`media/webview.js`), ja que os testes
   * de integracao nao interagem com o DOM dentro do iframe do webview.
   */
  simulateWebviewMessage(message: WebviewMessage): Promise<void>;
  /** Injeta um `VerifyScriptExecutor` (ex.: fake) para os testes de integracao (US04). */
  setVerifyScriptExecutor(executor: VerifyScriptExecutor): void;
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
  const webviewPanel = new TutorialWebviewPanel(context.extensionUri);
  const markdownRenderer = new MarkdownRenderer();
  let terminalService = new TerminalService(new VscodeTerminalFactory());
  let verifyExecutor: VerifyScriptExecutor = new NodeVerifyScriptExecutor();

  const treeView = vscode.window.createTreeView('tutoriaisView', {
    treeDataProvider: treeProvider
  });

  let lastResult: LoadResult = { status: 'none' };
  let controller: TutorialController | undefined;
  let controllerSub: vscode.Disposable | undefined;
  let stepExecutor: StepExecutor | undefined;
  /** Ultimo resultado de verificacao conhecido de cada etapa (US04), por indice. */
  const lastVerification = new Map<number, VerificationResult>();

  const tutorialDirOf = (result: LoadResult): vscode.Uri | undefined =>
    result.status === 'ok' ? dirOf(result.indexUri) : undefined;

  const disposeExecution = (): void => {
    controllerSub?.dispose();
    controllerSub = undefined;
    controller = undefined;
    stepExecutor = undefined;
    lastVerification.clear();
    webviewPanel.close();
  };

  const buildStepExecutor = (tutorialDir: vscode.Uri, webview: vscode.Webview): StepExecutor =>
    new StepExecutor({
      reader: new VscodeScriptReader(tutorialDir),
      markdown: markdownRenderer,
      fileNav: new FileNavigationService(new VscodeEditorOpener(tutorialDir)),
      terminal: terminalService,
      resolveAssetUri: (relativePath) =>
        webview.asWebviewUri(vscode.Uri.joinPath(tutorialDir, relativePath)).toString()
    });

  const renderScreen = async (): Promise<void> => {
    if (lastResult.status !== 'ok' || !controller || !stepExecutor) {
      return;
    }
    const tutorial = lastResult.tutorial;
    const screen = controller.getScreen();
    if (!screen) {
      return;
    }

    if (screen.kind === 'intro') {
      const rendered = await stepExecutor.openTextBlock(tutorial.details.intro);
      webviewPanel.renderIntro(tutorial.title, rendered.html);
      return;
    }

    if (screen.kind === 'step') {
      const step = tutorial.details.steps[screen.index];
      const rendered = await stepExecutor.openStep(step);
      const hasVerify = typeof step.verify === 'string' && step.verify.length > 0;
      const verification = lastVerification.get(screen.index);
      webviewPanel.renderStep({
        title: step.title,
        index: screen.index,
        total: tutorial.details.steps.length,
        html: rendered.html,
        hasVerify,
        verification: verification
          ? {
              success: verification.success,
              message: verification.success
                ? verification.output
                : (verification.expectedOutput ?? '')
            }
          : undefined
      });
      return;
    }

    const rendered = await stepExecutor.openTextBlock(tutorial.details.finish);
    const statuses = new Map<number, StepStatus>();
    tutorial.details.steps.forEach((_, index) => statuses.set(index, controller!.statusOf(index)));
    webviewPanel.renderFinish(
      rendered.html,
      getSummary(tutorial.details.steps, statuses),
      getTotalScore(tutorial.details.steps, statuses)
    );
  };

  /** Garante um `TutorialController` para a execucao em curso, criando-o na primeira interacao. */
  const ensureController = (): TutorialController | undefined => {
    const tutorialDir = tutorialDirOf(lastResult);
    if (lastResult.status !== 'ok' || !tutorialDir) {
      return undefined;
    }
    if (controller) {
      return controller;
    }
    const webview = webviewPanel.reveal(tutorialDir);
    stepExecutor = buildStepExecutor(tutorialDir, webview);
    const hasVerify = lastResult.tutorial.details.steps.map(
      (step) => typeof step.verify === 'string' && step.verify.length > 0
    );
    controller = new TutorialController(lastResult.tutorial.details.steps.length, hasVerify);
    controllerSub = controller.onDidChange((state) => {
      treeProvider.updateStatuses(state.statuses);
      void renderScreen();
    });
    return controller;
  };

  const iniciarExecucao = (): void => {
    const active = ensureController();
    const tutorialDir = tutorialDirOf(lastResult);
    if (!active || !tutorialDir) {
      return;
    }
    webviewPanel.reveal(tutorialDir);
    active.start();
  };

  const abrirEtapa = (index: number): void => {
    const active = ensureController();
    const tutorialDir = tutorialDirOf(lastResult);
    if (!active || !tutorialDir) {
      return;
    }
    webviewPanel.reveal(tutorialDir);
    active.goToStep(index);
  };

  const handleWebviewMessage = async (msg: WebviewMessage): Promise<void> => {
    if (!controller) {
      return;
    }
    if (msg.type === 'next') {
      controller.next();
    } else if (msg.type === 'previous') {
      controller.previous();
    } else if (msg.type === 'runCommand') {
      terminalService.runCommand(msg.command);
    } else if (msg.type === 'verify') {
      await runVerification();
    }
  };

  /** Executa a verificacao automatica da etapa atual (CA-1/CA-2/CA-4 da US04). */
  const runVerification = async (): Promise<void> => {
    const tutorialDir = tutorialDirOf(lastResult);
    if (lastResult.status !== 'ok' || !controller || !tutorialDir) {
      return;
    }
    const screen = controller.getScreen();
    if (!screen || screen.kind !== 'step') {
      return;
    }
    const step = lastResult.tutorial.details.steps[screen.index];
    if (typeof step.verify !== 'string') {
      return;
    }
    const runner = new EvaluationRunner({ executor: verifyExecutor, terminal: terminalService });
    const result = await runner.verify(step, tutorialDir.fsPath);
    lastVerification.set(screen.index, result);
    controller.recordVerificationResult(screen.index, result);
  };

  const applyResult = async (result: LoadResult): Promise<void> => {
    if (controller) {
      // O tutorial mudou (revalidacao manual ou watcher) enquanto uma execucao
      // estava em curso: encerra para nao executar sobre uma definicao obsoleta.
      disposeExecution();
    }
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

    notifier.notify(result);
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
    webviewPanel,
    watcher.onDidReload((result) => {
      void applyResult(result);
    }),
    webviewPanel.onDidReceiveMessage(handleWebviewMessage),
    registerCommands({
      revalidate: async () => {
        await reloadAndApply();
      },
      iniciarExecucao,
      abrirEtapa
    }),
    { dispose: disposeExecution }
  );

  await reloadAndApply();

  return {
    reload: reloadAndApply,
    getLastResult: () => lastResult,
    resetNotifier: () => notifier.reset(),
    treeProvider,
    webviewPanel,
    getController: () => controller,
    setTerminalService: (service: TerminalService) => {
      terminalService = service;
    },
    setVerifyScriptExecutor: (executor: VerifyScriptExecutor) => {
      verifyExecutor = executor;
    },
    simulateWebviewMessage: handleWebviewMessage
  };
}

export function deactivate(): void {
  // Todos os recursos sao liberados via context.subscriptions.
}
