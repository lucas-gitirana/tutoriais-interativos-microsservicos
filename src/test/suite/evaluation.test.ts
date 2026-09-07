import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
  activateExtension,
  describeScenario,
  indexUri,
  stubShowWarningMessage,
  waitFor
} from './harness';

describeScenario(
  'eval-invalid',
  'script verify fora do padrao .sh bloqueia o tutorial (US02 CA-1)',
  () => {
    it('exibe aviso, publica diagnostico Error no verify e nao disponibiliza', async () => {
      const warn = stubShowWarningMessage();
      try {
        const api = await activateExtension();
        api.resetNotifier();
        await api.reload();

        const result = api.getLastResult();
        assert.strictEqual(result.status, 'invalid', JSON.stringify(result));

        await waitFor(() => warn.calls.some((m) => m.includes('index.json invalido')));
        assert.ok(
          warn.calls.some((m) => /\.sh/.test(m)),
          `chamadas: ${JSON.stringify(warn.calls)}`
        );

        await waitFor(() => vscode.languages.getDiagnostics(indexUri()).length > 0);
        const errors = vscode.languages
          .getDiagnostics(indexUri())
          .filter((d) => d.severity === vscode.DiagnosticSeverity.Error);
        assert.ok(errors.length >= 1);
        assert.ok(
          errors[0].range.end.character > 0 ||
            errors[0].range.end.line > errors[0].range.start.line,
          'o diagnostico deve ter um range util sobre o valor de verify'
        );

        const roots = api.treeProvider.getChildren();
        assert.strictEqual(roots[0].kind, 'invalid');
      } finally {
        warn.restore();
      }
    });
  }
);

describeScenario(
  'eval-warn',
  'etapa com verify e sem points gera aviso, mas o tutorial fica disponivel (US02 RF14)',
  () => {
    it('status ok, >= 1 diagnostico Warning e nenhum Error', async () => {
      const api = await activateExtension();
      await api.reload();

      assert.strictEqual(api.getLastResult().status, 'ok');

      await waitFor(() => vscode.languages.getDiagnostics(indexUri()).length > 0);
      const diags = vscode.languages.getDiagnostics(indexUri());
      assert.strictEqual(
        diags.filter((d) => d.severity === vscode.DiagnosticSeverity.Error).length,
        0
      );
      assert.ok(
        diags.some((d) => d.severity === vscode.DiagnosticSeverity.Warning),
        'deve haver ao menos um aviso de coerencia de pontuacao'
      );

      const roots = api.treeProvider.getChildren();
      assert.strictEqual(roots[0].kind, 'root');
    });
  }
);
