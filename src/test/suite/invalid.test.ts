import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
  activateExtension,
  describeScenario,
  indexUri,
  stubShowWarningMessage,
  waitFor
} from './harness';

describeScenario('invalid', 'workspace com index.json invalido (T7.3)', () => {
  it('exibe aviso, publica diagnostico com range e nao disponibiliza', async () => {
    const warn = stubShowWarningMessage();
    try {
      const api = await activateExtension();
      // A extensao pode ter ativado (e notificado) antes do stub; forca nova notificacao.
      api.resetNotifier();
      await api.reload();

      const result = api.getLastResult();
      assert.strictEqual(result.status, 'invalid', JSON.stringify(result));

      // showWarningMessage foi chamado.
      await waitFor(() => warn.calls.some((m) => m.includes('index.json invalido')));
      assert.ok(
        warn.calls.some((m) => m.includes('index.json invalido')),
        `chamadas: ${JSON.stringify(warn.calls)}`
      );

      // >= 1 diagnostico de severidade Error com range nao nulo.
      await waitFor(() => vscode.languages.getDiagnostics(indexUri()).length > 0);
      const diags = vscode.languages.getDiagnostics(indexUri());
      const errors = diags.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error
      );
      assert.ok(errors.length >= 1);
      assert.ok(
        errors[0].range.end.character > 0 ||
          errors[0].range.end.line > errors[0].range.start.line,
        'o diagnostico deve ter um range util'
      );

      // TreeView mostra o item de tutorial invalido.
      const roots = api.treeProvider.getChildren();
      assert.strictEqual(roots.length, 1);
      assert.strictEqual(roots[0].kind, 'invalid');
    } finally {
      warn.restore();
    }
  });
});
