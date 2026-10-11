import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { PerformanceRecord } from '../../evaluation/PerformanceRecord';
import { ReportResult, ResultReporter } from '../../evaluation/ResultReporter';
import { VerifyRunResult, VerifyScriptExecutor } from '../../evaluation/VerifyScriptExecutor';
import { TerminalFactory, TerminalHandle, TerminalService } from '../../execution/TerminalService';
import { activateExtension, describeScenario, waitFor } from './harness';
import type { TutorialExtensionApi } from '../../extension';

class FakeTerminalFactory implements TerminalFactory {
  create(): TerminalHandle {
    return {
      show: () => undefined,
      sendText: () => undefined,
      closed: false
    };
  }
}

/** Etapa 1 passa, etapa 2 falha: nota 10 / 25 no fixture `report-tutorial`. */
class FakeVerifyScriptExecutor implements VerifyScriptExecutor {
  run(absoluteScriptPath: string): Promise<VerifyRunResult> {
    const ok = absoluteScriptPath.endsWith('verify-step-01.sh');
    return Promise.resolve({ exitCode: ok ? 0 : 1, output: ok ? '' : 'falhou', timedOut: false });
  }
}

class FakeResultReporter implements ResultReporter {
  calls: Array<{ endpoint: string; record: PerformanceRecord }> = [];
  constructor(private readonly result: ReportResult) {}

  send(endpoint: string, record: PerformanceRecord): Promise<ReportResult> {
    this.calls.push({ endpoint, record });
    return Promise.resolve(this.result);
  }
}

function html(api: TutorialExtensionApi): string {
  return api.webviewPanel.getHtmlForTests() ?? '';
}

async function waitForHtml(api: TutorialExtensionApi, substring: string): Promise<void> {
  await waitFor(() => html(api).includes(substring));
}

/** Executa o tutorial do inicio ate a tela de finalizacao (verificando as duas etapas). */
async function irAteFinalizacao(api: TutorialExtensionApi): Promise<void> {
  api.setVerifyScriptExecutor(new FakeVerifyScriptExecutor());
  api.setTerminalService(new TerminalService(new FakeTerminalFactory()));

  await vscode.commands.executeCommand('tutoriais.executar');
  await waitForHtml(api, 'Começar');
  void api.simulateWebviewMessage({ type: 'next' });
  await waitForHtml(api, 'Etapa 1/2');
  await api.simulateWebviewMessage({ type: 'verify' });
  await waitForHtml(api, 'Etapa concluída corretamente');
  void api.simulateWebviewMessage({ type: 'next' });
  await waitForHtml(api, 'Etapa 2/2');
  await api.simulateWebviewMessage({ type: 'verify' });
  await waitForHtml(api, 'Etapa incorreta');
  void api.simulateWebviewMessage({ type: 'next' });
  await waitForHtml(api, 'id="btn-report"');
}

describeScenario('report', 'registro de desempenho do aluno (US07)', () => {
  it('tela de finalização mostra o formulário com aviso de envio', async () => {
    const api = await activateExtension();
    await api.reload();
    api.setResultReporter(new FakeResultReporter({ ok: true }));

    await irAteFinalizacao(api);

    const page = html(api);
    assert.match(page, /Registrar desempenho/);
    assert.match(page, /id="report-nome"/);
    assert.doesNotMatch(page, /matr[ií]cula/i);
    assert.match(page, /seu nome e sua nota serão enviados ao professor/);
  });

  it('nome vazio não envia e mostra o motivo', async () => {
    const api = await activateExtension();
    await api.reload();
    const reporter = new FakeResultReporter({ ok: true });
    api.setResultReporter(reporter);

    await irAteFinalizacao(api);
    await api.simulateWebviewMessage({ type: 'submitResult', nome: '   ' });
    await waitForHtml(api, 'Informe seu nome');

    assert.strictEqual(reporter.calls.length, 0);
    assert.match(html(api), /Tentar novamente/);
  });

  it('envio bem-sucedido manda nome e nota e trava o reenvio', async () => {
    const api = await activateExtension();
    await api.reload();
    const reporter = new FakeResultReporter({ ok: true });
    api.setResultReporter(reporter);

    await irAteFinalizacao(api);
    await api.simulateWebviewMessage({ type: 'submitResult', nome: '  Ana Souza ' });
    await waitForHtml(api, 'Resultado enviado');

    assert.strictEqual(reporter.calls.length, 1);
    const { endpoint, record } = reporter.calls[0];
    assert.strictEqual(endpoint, 'https://exemplo.invalid/registro');
    assert.strictEqual(record.nome, 'Ana Souza');
    assert.strictEqual(record.nota, 10);
    assert.strictEqual(record.notaMaxima, 25);
    assert.strictEqual(record.token, 'turma-teste');
    assert.deepStrictEqual(
      record.etapas.map((e) => e.status),
      ['correct', 'incorrect']
    );
    assert.doesNotMatch(html(api), /id="btn-report"/);

    // Um segundo clique (ex.: mensagem atrasada) nao gera novo envio.
    await api.simulateWebviewMessage({ type: 'submitResult', nome: 'Ana' });
    assert.strictEqual(reporter.calls.length, 1);
  });

  it('nova execução preenche o nome informado antes', async () => {
    const api = await activateExtension();
    await api.reload();
    api.setResultReporter(new FakeResultReporter({ ok: true }));

    await irAteFinalizacao(api);
    assert.match(html(api), /id="report-nome"[^>]*value="Ana Souza"/);
  });

  it('falha no envio mostra o erro e salva cópia local do registro', async () => {
    const api = await activateExtension();
    await api.reload();
    api.setResultReporter(new FakeResultReporter({ ok: false, message: 'sem rede' }));

    await irAteFinalizacao(api);
    await api.simulateWebviewMessage({ type: 'submitResult', nome: 'Bia Lima' });
    await waitForHtml(api, 'sem rede');

    const folder = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const arquivo = path.join(folder, 'resultado-implementando-o-padrao-cqrs-bia-lima.json');
    assert.ok(fs.existsSync(arquivo), 'cópia local do registro deveria existir');
    const salvo = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as Record<string, unknown>;
    assert.strictEqual(salvo.nome, 'Bia Lima');
    assert.strictEqual(salvo.nota, 10);
    assert.strictEqual(salvo.token, undefined);
    assert.match(html(api), /Tentar novamente/);
  });
});
