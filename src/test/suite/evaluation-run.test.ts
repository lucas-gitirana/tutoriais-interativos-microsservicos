import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { StepStatus } from '../../controller/types';
import { VerifyRunResult, VerifyScriptExecutor } from '../../evaluation/VerifyScriptExecutor';
import { TerminalFactory, TerminalHandle, TerminalService } from '../../execution/TerminalService';
import { activateExtension, describeScenario, waitFor } from './harness';
import type { TutorialExtensionApi } from '../../extension';

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

/** {@link VerifyScriptExecutor} determinístico: resultado por sufixo do caminho do script. */
class FakeVerifyScriptExecutor implements VerifyScriptExecutor {
  results = new Map<string, VerifyRunResult>();
  calls: Array<{ absoluteScriptPath: string; cwd: string }> = [];
  private fallback: VerifyRunResult = { exitCode: 0, output: '', timedOut: false };

  run(absoluteScriptPath: string, cwd: string): Promise<VerifyRunResult> {
    this.calls.push({ absoluteScriptPath, cwd });
    for (const [suffix, result] of this.results) {
      if (absoluteScriptPath.endsWith(suffix)) {
        return Promise.resolve(result);
      }
    }
    return Promise.resolve(this.fallback);
  }
}

const SUCESSO: VerifyRunResult = { exitCode: 0, output: 'Etapa 1 concluída.', timedOut: false };
const FALHA: VerifyRunResult = {
  exitCode: 1,
  output: "Esperado: arquivo 'src/order-service/projections.py' com o modelo de leitura (projeção).",
  timedOut: false
};

/**
 * Espera o HTML do painel conter `substring`. Necessário porque `extension.ts` dispara
 * `renderScreen()` de forma assíncrona e sem aguardar (`void renderScreen()`) a cada mudança de
 * tela/status — esperar só o estado interno do controller (que muda de forma síncrona) não
 * garante que o render já assentou, e disparar a próxima ação antes disso pode deixar dois
 * renders sobrepostos resolverem fora de ordem (mesma causa-raiz do ajuste em `execution.test.ts`).
 */
async function waitForHtml(api: TutorialExtensionApi, substring: string): Promise<void> {
  await waitFor(() => (api.webviewPanel.getHtmlForTests() ?? '').includes(substring));
}

describeScenario('evaluation-run', 'avaliação automática de etapa (US04/US05)', () => {
  it('CA-1/CA-2: verificação bem-sucedida mostra sucesso e marca check na TreeView', async () => {
    const api = await activateExtension();
    await api.reload();

    const executor = new FakeVerifyScriptExecutor();
    executor.results.set('verify-step-01.sh', SUCESSO);
    api.setVerifyScriptExecutor(executor);
    const fakeFactory = new FakeTerminalFactory();
    api.setTerminalService(new TerminalService(fakeFactory));

    await vscode.commands.executeCommand('tutoriais.abrirEtapa', 0);
    // CA-1: etapa com verify tem o botao "Verificar" no HTML (espera o render assentar).
    await waitForHtml(api, 'id="btn-verify"');

    await api.simulateWebviewMessage({ type: 'verify' });
    // CA-2: indicacao de sucesso no painel (espera o render pos-verificacao, nao so o status
    // interno — este ja muda de forma sincrona bem antes do HTML atualizar).
    await waitForHtml(api, 'Etapa concluída corretamente');
    assert.strictEqual(api.getController()?.statusOf(0), StepStatus.COMPLETED);

    const root = api.treeProvider.getChildren()[0];
    const step0 = api.treeProvider
      .getChildren(root)
      .find((s) => s.kind === 'step' && s.index === 0);
    assert.ok(step0 && step0.kind === 'step');
    assert.strictEqual((step0 as { status: StepStatus }).status, StepStatus.COMPLETED);

    // Heartbeat sem reexecucao: terminal recebe so a linha fixa, nunca o script.
    assert.deepStrictEqual(fakeFactory.handles[0].sent, [
      'echo "› Executando verificação da etapa..."'
    ]);
  });

  it('CA-2/CA-4: verificação malsucedida mostra falha e o resultado esperado', async () => {
    const api = await activateExtension();
    await api.reload();

    const executor = new FakeVerifyScriptExecutor();
    executor.results.set('verify-step-02.sh', FALHA);
    api.setVerifyScriptExecutor(executor);
    api.setTerminalService(new TerminalService(new FakeTerminalFactory()));

    await vscode.commands.executeCommand('tutoriais.abrirEtapa', 1);
    await waitForHtml(api, 'id="btn-verify"');

    await api.simulateWebviewMessage({ type: 'verify' });
    await waitForHtml(api, 'Etapa incorreta');

    const html = api.webviewPanel.getHtmlForTests() ?? '';
    assert.match(html, /projections\.py/);
    assert.strictEqual(api.getController()?.statusOf(1), StepStatus.FAILED);

    const root = api.treeProvider.getChildren()[0];
    const step1 = api.treeProvider
      .getChildren(root)
      .find((s) => s.kind === 'step' && s.index === 1);
    assert.ok(step1 && step1.kind === 'step');
    assert.strictEqual((step1 as { status: StepStatus }).status, StepStatus.FAILED);
  });

  it('CA-3: reexecutar apos corrigir atualiza o resultado sem reabrir a etapa', async () => {
    const api = await activateExtension();
    await api.reload();

    const executor = new FakeVerifyScriptExecutor();
    executor.results.set('verify-step-02.sh', FALHA);
    api.setVerifyScriptExecutor(executor);
    api.setTerminalService(new TerminalService(new FakeTerminalFactory()));

    await vscode.commands.executeCommand('tutoriais.abrirEtapa', 1);
    await waitForHtml(api, 'id="btn-verify"');

    await api.simulateWebviewMessage({ type: 'verify' });
    await waitForHtml(api, 'Etapa incorreta');

    // "Corrige" o script fixture: proxima chamada passa.
    executor.results.set('verify-step-02.sh', SUCESSO);
    await api.simulateWebviewMessage({ type: 'verify' });
    await waitForHtml(api, 'Etapa concluída corretamente');

    assert.strictEqual(api.getController()?.statusOf(1), StepStatus.COMPLETED);
    assert.strictEqual(executor.calls.length, 2);
  });

  it('US05: avançar sem verificar não gera erro e mantém a etapa pendente', async () => {
    const api = await activateExtension();
    await api.reload();

    const executor = new FakeVerifyScriptExecutor();
    api.setVerifyScriptExecutor(executor);
    api.setTerminalService(new TerminalService(new FakeTerminalFactory()));

    await vscode.commands.executeCommand('tutoriais.executar');
    await waitForHtml(api, 'Começar');

    api.simulateWebviewMessage({ type: 'next' }); // intro -> step 0
    await waitForHtml(api, 'id="btn-verify"');

    // CA-1 de US05: nunca chamou 'verify'.
    api.simulateWebviewMessage({ type: 'next' }); // step 0 -> step 1, sem verificar
    await waitFor(() => {
      const screen = api.getController()?.getScreen();
      return screen?.kind === 'step' && screen.index === 1;
    });

    assert.strictEqual(api.getController()?.statusOf(0), StepStatus.PENDING);
    assert.strictEqual(executor.calls.length, 0);
  });

  it('RF15/RF16: nota final e resumo na tela de finalização', async () => {
    const api = await activateExtension();
    await api.reload();

    const executor = new FakeVerifyScriptExecutor();
    executor.results.set('verify-step-01.sh', SUCESSO);
    executor.results.set('verify-step-02.sh', FALHA);
    api.setVerifyScriptExecutor(executor);
    api.setTerminalService(new TerminalService(new FakeTerminalFactory()));

    await vscode.commands.executeCommand('tutoriais.abrirEtapa', 0);
    await waitForHtml(api, 'id="btn-verify"');
    await api.simulateWebviewMessage({ type: 'verify' });
    await waitForHtml(api, 'Etapa concluída corretamente');

    api.simulateWebviewMessage({ type: 'next' }); // step 0 -> step 1
    await waitForHtml(api, 'Etapa 2/2');
    await api.simulateWebviewMessage({ type: 'verify' });
    await waitForHtml(api, 'Etapa incorreta');

    api.simulateWebviewMessage({ type: 'next' }); // step 1 -> finish
    await waitForHtml(api, 'Nota final');

    const html = api.webviewPanel.getHtmlForTests() ?? '';
    // Etapa 0 (10 pts, correta) + Etapa 1 (15 pts, incorreta) => 10/25.
    assert.match(html, /Nota final:.*10 \/ 25 pontos/);
    assert.match(html, /class="correct"/);
    assert.match(html, /class="incorrect"/);
  });
});
