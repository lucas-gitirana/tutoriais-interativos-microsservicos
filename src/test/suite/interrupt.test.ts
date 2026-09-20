import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { StepStatus } from '../../controller/types';
import { activateExtension, describeScenario, waitFor } from './harness';
import type { TutorialExtensionApi } from '../../extension';

/** Substitui `showWarningMessage` por um stub que responde `answer`; devolve o restaurador. */
function stubConfirmation(answer: string | undefined): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const original = vscode.window.showWarningMessage;
  (vscode.window as unknown as Record<string, unknown>).showWarningMessage = (message: string) => {
    calls.push(message);
    return Promise.resolve(answer);
  };
  return {
    calls,
    restore: () => {
      (vscode.window as unknown as Record<string, unknown>).showWarningMessage = original;
    }
  };
}

async function waitForHtml(api: TutorialExtensionApi, substring: string): Promise<void> {
  await waitFor(() => (api.webviewPanel.getHtmlForTests() ?? '').includes(substring));
}

function stepStatuses(api: TutorialExtensionApi): StepStatus[] {
  const root = api.treeProvider.getChildren()[0];
  return api.treeProvider
    .getChildren(root)
    .map((node) => (node as { status: StepStatus }).status);
}

/** Inicia a execucao, abre a etapa 1 e a marca como concluida via resultado de verificacao. */
async function iniciarComProgresso(api: TutorialExtensionApi): Promise<void> {
  await api.reload();
  await vscode.commands.executeCommand('tutoriais.executar');
  await waitForHtml(api, 'id="btn-next"');
  await api.simulateWebviewMessage({ type: 'next' }); // intro -> etapa 1
  await waitForHtml(api, 'id="btn-stop"');
  const controller = api.getController();
  assert.ok(controller);
  controller!.recordVerificationResult(0, { success: true, output: 'ok' });
  assert.strictEqual(controller!.statusOf(0), StepStatus.COMPLETED);
}

describeScenario('interrupt', 'interromper execução do tutorial (US06)', () => {
  it('CA-1/CA-2: interromper fecha o painel e remove os ícones de status', async () => {
    const api = await activateExtension();
    await iniciarComProgresso(api);
    assert.ok(stepStatuses(api).includes(StepStatus.COMPLETED));

    const stub = stubConfirmation('Interromper');
    try {
      await vscode.commands.executeCommand('tutoriais.interromper');
    } finally {
      stub.restore();
    }

    assert.strictEqual(stub.calls.length, 1);
    assert.strictEqual(api.webviewPanel.isOpen(), false);
    assert.strictEqual(api.getController()?.getScreen(), undefined);
    assert.ok(stepStatuses(api).every((s) => s === StepStatus.PENDING));
  });

  it('cancelar a confirmação mantém painel e progresso', async () => {
    const api = await activateExtension();
    await iniciarComProgresso(api);

    const stub = stubConfirmation(undefined);
    try {
      await vscode.commands.executeCommand('tutoriais.interromper');
    } finally {
      stub.restore();
    }

    assert.strictEqual(api.webviewPanel.isOpen(), true);
    assert.strictEqual(api.getController()?.statusOf(0), StepStatus.COMPLETED);
    assert.ok(api.getController()?.getScreen());
  });

  it('reiniciar depois de interromper começa da introdução, sem progresso anterior', async () => {
    const api = await activateExtension();
    await iniciarComProgresso(api);

    const stub = stubConfirmation('Interromper');
    try {
      await vscode.commands.executeCommand('tutoriais.interromper');
    } finally {
      stub.restore();
    }

    await vscode.commands.executeCommand('tutoriais.executar');
    await waitForHtml(api, 'id="btn-next"');
    assert.deepStrictEqual(api.getController()?.getScreen(), { kind: 'intro' });
    assert.strictEqual(api.getController()?.statusOf(0), StepStatus.PENDING);
    assert.ok(stepStatuses(api).every((s) => s === StepStatus.PENDING));
  });

  it('o botão "Parar tutorial" do webview segue o mesmo caminho do comando', async () => {
    const api = await activateExtension();
    await iniciarComProgresso(api);

    const stub = stubConfirmation('Interromper');
    try {
      await api.simulateWebviewMessage({ type: 'stop' });
    } finally {
      stub.restore();
    }

    assert.strictEqual(stub.calls.length, 1);
    assert.strictEqual(api.webviewPanel.isOpen(), false);
    assert.ok(stepStatuses(api).every((s) => s === StepStatus.PENDING));
  });

  it('a tela de finalização não oferece "Parar tutorial"', async () => {
    const api = await activateExtension();
    await api.reload();
    await vscode.commands.executeCommand('tutoriais.executar');
    await waitForHtml(api, 'id="btn-next"');
    const controller = api.getController()!;
    controller.next();
    await waitForHtml(api, 'Etapa 1/2');
    controller.next();
    await waitForHtml(api, 'Etapa 2/2');
    controller.next();
    await waitForHtml(api, 'tutoriais-summary');
    assert.ok(!(api.webviewPanel.getHtmlForTests() ?? '').includes('btn-stop'));
    api.webviewPanel.close();
  });
});
