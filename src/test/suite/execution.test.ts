import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { StepStatus } from '../../controller/types';
import { TerminalFactory, TerminalHandle, TerminalService } from '../../execution/TerminalService';
import { activateExtension, describeScenario, waitFor } from './harness';

class FakeTerminalHandle implements TerminalHandle {
  sent: string[] = [];
  closed = false;
  show(): void {
    /* nada a fazer no fake */
  }
  sendText(command: string): void {
    this.sent.push(command);
  }
}

class FakeTerminalFactory implements TerminalFactory {
  handles: FakeTerminalHandle[] = [];
  create(): TerminalHandle {
    const handle = new FakeTerminalHandle();
    this.handles.push(handle);
    return handle;
  }
}

describeScenario('execution', 'execucao de um tutorial valido (US03)', () => {
  it('play abre a introducao, avancar marca check e chega na finalizacao', async () => {
    const api = await activateExtension();
    await api.reload();
    assert.strictEqual(api.getLastResult().status, 'ok');

    const fakeFactory = new FakeTerminalFactory();
    api.setTerminalService(new TerminalService(fakeFactory));

    // CA-2: play abre a tela de introducao.
    await vscode.commands.executeCommand('tutoriais.executar');
    await waitFor(() => api.webviewPanel.getHtmlForTests()?.includes('Começar') ?? false);
    assert.ok(api.webviewPanel.getHtmlForTests()?.includes('Implementando o padrão CQRS'));

    // RF09: o `background` da introducao (setup.sh) roda automaticamente, sem clique.
    await waitFor(() => fakeFactory.handles.length > 0 && fakeFactory.handles[0].sent.length > 0);

    // Avanca da introducao para a etapa 0.
    api.simulateWebviewMessage({ type: 'next' });
    await waitFor(() => api.getController()?.getScreen()?.kind === 'step');
    await waitFor(() => (api.webviewPanel.getHtmlForTests()?.includes('Avançar') ?? false));

    // CA-6: a etapa 0 tem `file`, o editor deve abrir ao lado com a linha certa.
    await waitFor(() =>
      vscode.window.visibleTextEditors.some((ed) => ed.document.fileName.endsWith('app.py'))
    );
    const editor = vscode.window.visibleTextEditors.find((ed) =>
      ed.document.fileName.endsWith('app.py')
    );
    assert.ok(editor, 'editor do FileTarget nao foi aberto');
    assert.strictEqual(editor!.selection.start.line, 11);

    // CA-7: o bloco ```bash da etapa 0 gera um botao com o comando esperado.
    assert.match(api.webviewPanel.getHtmlForTests() ?? '', /tutoriais-cmd-run/);
    api.simulateWebviewMessage({ type: 'runCommand', command: 'docker ps' });
    await waitFor(() => fakeFactory.handles.some((h) => h.sent.includes('docker ps')));

    // CA-4: avancar marca a etapa 0 como concluida (check) na TreeView.
    api.simulateWebviewMessage({ type: 'next' });
    await waitFor(() => api.getController()?.statusOf(0) === StepStatus.COMPLETED);
    const root = api.treeProvider.getChildren()[0];
    const steps = api.treeProvider.getChildren(root);
    const step0 = steps.find((s) => s.kind === 'step' && s.index === 0);
    assert.ok(step0 && step0.kind === 'step');
    assert.strictEqual((step0 as { status: StepStatus }).status, StepStatus.COMPLETED);

    // Avanca ate a ultima etapa e depois para a finalizacao (CA-5).
    api.simulateWebviewMessage({ type: 'next' });
    await waitFor(() => api.getController()?.getScreen()?.kind === 'finish');
    assert.match(api.webviewPanel.getHtmlForTests() ?? '', /tutoriais-summary/);
  });

  it('clique direto numa etapa (sem play) abre a etapa sem marcar conclusao (CA-3)', async () => {
    const api = await activateExtension();
    await api.reload();

    await vscode.commands.executeCommand('tutoriais.abrirEtapa', 1);
    await waitFor(() => api.getController()?.getScreen()?.kind === 'step');
    assert.deepStrictEqual(api.getController()?.getScreen(), { kind: 'step', index: 1 });
    assert.strictEqual(api.getController()?.statusOf(0), StepStatus.PENDING);
    assert.strictEqual(api.getController()?.statusOf(1), StepStatus.PENDING);
  });
});
