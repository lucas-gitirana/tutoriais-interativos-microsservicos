import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { activateExtension, describeScenario, indexUri, waitFor } from './harness';

describeScenario('happy', 'workspace com index.json valido (T7.2)', () => {
  it('lista o tutorial com titulo + N etapas e o disponibiliza', async () => {
    const api = await activateExtension();
    await api.reload();

    const result = api.getLastResult();
    assert.strictEqual(result.status, 'ok', JSON.stringify(result));

    // Raiz da TreeView = titulo do tutorial.
    const roots = api.treeProvider.getChildren();
    assert.strictEqual(roots.length, 1);
    assert.strictEqual(roots[0].kind, 'root');

    // Filhos = uma etapa por item, na ordem do array.
    const steps = api.treeProvider.getChildren(roots[0]);
    if (result.status === 'ok') {
      assert.deepStrictEqual(
        steps.map((s) => (s.kind === 'step' ? s.label : s.kind)),
        result.tutorial.details.steps.map((s) => s.title)
      );

      // US02: cada etapa expoe a avaliacao automatica vinculada e a pontuacao.
      assert.deepStrictEqual(
        steps.map((s) => (s.kind === 'step' ? s.hasVerify : null)),
        result.tutorial.details.steps.map((s) => typeof s.verify === 'string')
      );
      assert.deepStrictEqual(
        steps.map((s) => (s.kind === 'step' ? s.points : null)),
        result.tutorial.details.steps.map((s) =>
          typeof s.points === 'number' ? s.points : undefined
        )
      );
    }

    // Comando de execucao registrado (habilitado via context key tutoriais.disponivel).
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('tutoriais.executar'));

    // Nenhum diagnostico de erro no index.json.
    await waitFor(() => vscode.languages.getDiagnostics(indexUri()).length === 0);
    assert.strictEqual(vscode.languages.getDiagnostics(indexUri()).length, 0);
  });
});
