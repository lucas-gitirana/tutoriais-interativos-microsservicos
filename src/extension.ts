import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { TutorialController } from './controller/TutorialController';
import { StepStatus } from './controller/types';
import { JsonDiagnostics } from './diagnostics/JsonDiagnostics';
import { EvaluationRunner } from './evaluation/EvaluationRunner';
import { HttpResultReporter } from './evaluation/HttpResultReporter';
import { NodeVerifyScriptExecutor } from './evaluation/NodeVerifyScriptExecutor';
import {
  buildPerformanceRecord,
  fallbackFileContent,
  fallbackFileName,
  validateStudentName
} from './evaluation/PerformanceRecord';
import { ResultReporter } from './evaluation/ResultReporter';
import { FinishSummaryItem, getSummary, getTotalScore } from './evaluation/ScoreTracker';
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
import {
  ReportViewData,
  TutorialWebviewPanel,
  WebviewMessage
} from './webview/TutorialWebviewPanel';

/** Chave do `globalState` com o ultimo nome informado pelo aluno */
const STUDENT_KEY = 'tutoriais.aluno';

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
  /** Injeta um `ResultReporter` (ex.: fake) para os testes de integracao (US07). */
  setResultReporter(reporter: ResultReporter): void;
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
  let resultReporter: ResultReporter = new HttpResultReporter();

  const treeView = vscode.window.createTreeView('tutoriaisView', {
    treeDataProvider: treeProvider
  });

  let lastResult: LoadResult = { status: 'none' };
  let controller: TutorialController | undefined;
  let controllerSub: vscode.Disposable | undefined;
  let stepExecutor: StepExecutor | undefined;
  /** Ultimo resultado de verificacao conhecido de cada etapa (US04), por indice. */
  const lastVerification = new Map<number, VerificationResult>();
  
  let finishView:
    | { html: string; summary: FinishSummaryItem[]; score: { total: number; possible: number } }
    | undefined;
  let reportState: ReportViewData | undefined;

  const resetReport = (): void => {
    finishView = undefined;
    reportState = undefined;
  };

  const tutorialDirOf = (result: LoadResult): vscode.Uri | undefined =>
    result.status === 'ok' ? dirOf(result.indexUri) : undefined;

  const setEmExecucao = (value: boolean): void => {
    void vscode.commands.executeCommand('setContext', 'tutoriais.emExecucao', value);
  };

  const disposeExecution = (): void => {
    controllerSub?.dispose();
    controllerSub = undefined;
    controller = undefined;
    stepExecutor = undefined;
    lastVerification.clear();
    resetReport();
    setEmExecucao(false);
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
    const statuses = currentStatuses();
    finishView = {
      html: rendered.html,
      summary: getSummary(tutorial.details.steps, statuses),
      score: getTotalScore(tutorial.details.steps, statuses)
    };
    if (tutorial.report && !reportState) {
      const saved = context.globalState.get<unknown>(STUDENT_KEY);
      reportState = { nome: typeof saved === 'string' ? saved : '', status: 'idle' };
    }
    renderFinishView();
  };

  const currentStatuses = (): Map<number, StepStatus> => {
    const statuses = new Map<number, StepStatus>();
    if (lastResult.status === 'ok' && controller) {
      lastResult.tutorial.details.steps.forEach((_, index) =>
        statuses.set(index, controller!.statusOf(index))
      );
    }
    return statuses;
  };

  const renderFinishView = (): void => {
    if (!finishView) {
      return;
    }
    webviewPanel.renderFinish(
      finishView.html,
      finishView.summary,
      finishView.score,
      lastResult.status === 'ok' && lastResult.tutorial.report ? reportState : undefined
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
      setEmExecucao(state.screen !== undefined);
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
    resetReport();
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
    } else if (msg.type === 'stop') {
      await interromperTutorial();
    } else if (msg.type === 'submitResult') {
      await submitResult(msg.nome);
    }
  };

  /**
   * Envia nome e nota ao endpoint do professor Em caso de falha, 
   * grava uma copia local do registro para o aluno entregar 
   * por outro meio.
   */
  const submitResult = async (nome: string): Promise<void> => {
    const tutorialDir = tutorialDirOf(lastResult);
    if (lastResult.status !== 'ok' || !controller || !tutorialDir || !reportState) {
      return;
    }
    const report = lastResult.tutorial.report;
    if (
      !report ||
      controller.getScreen()?.kind !== 'finish' ||
      reportState.status === 'sending' ||
      reportState.status === 'sent'
    ) {
      return;
    }

    const validation = validateStudentName(nome);
    if (!validation.ok) {
      reportState = { nome, status: 'failed', message: validation.message };
      renderFinishView();
      return;
    }
    const nomeAluno = validation.nome;
    await context.globalState.update(STUDENT_KEY, nomeAluno);

    const sending: ReportViewData = { nome: nomeAluno, status: 'sending' };
    reportState = sending;
    renderFinishView();

    const record = buildPerformanceRecord(
      lastResult.tutorial,
      currentStatuses(),
      nomeAluno,
      new Date()
    );
    const result = await resultReporter.send(report.endpoint, record);
    if (reportState !== sending) {
      return;
    }

    if (result.ok) {
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      reportState = { nome: nomeAluno, status: 'sent', message: `✓ Resultado enviado às ${hora}.` };
    } else {
      let message = `✗ Não foi possível enviar o resultado: ${result.message}`;
      const fileName = fallbackFileName(record);
      try {
        await vscode.workspace.fs.writeFile(
          vscode.Uri.joinPath(tutorialDir, fileName),
          Buffer.from(fallbackFileContent(record), 'utf8')
        );
        message += `\nUma cópia foi salva em "${fileName}"; se o envio continuar falhando, entregue esse arquivo ao professor.`;
      } catch {
        // Sem copia local: a mensagem de erro do envio ja orienta o aluno.
      }
      reportState = { nome: nomeAluno, status: 'failed', message };
    }
    renderFinishView();
  };

  /** Interrompe a execucao (US06) apos confirmacao: zera o progresso e fecha o painel. */
  const interromperTutorial = async (): Promise<void> => {
    if (!controller) {
      return;
    }
    const escolha = await vscode.window.showWarningMessage(
      'Interromper a execução do tutorial? O progresso desta execução será perdido.',
      { modal: true },
      'Interromper'
    );
    if (escolha !== 'Interromper') {
      return;
    }
    lastVerification.clear();
    resetReport();
    controller.stop();
    webviewPanel.close();
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
    await vscode.workspace.saveAll(false);
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
      abrirEtapa,
      interromperTutorial
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
    setResultReporter: (reporter: ResultReporter) => {
      resultReporter = reporter;
    },
    simulateWebviewMessage: handleWebviewMessage
  };
}

export function deactivate(): void {
  // Todos os recursos sao liberados via context.subscriptions.
}
