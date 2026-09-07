import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
  activateExtension,
  describeScenario,
  indexUri,
  stubShowWarningMessage,
  waitFor
} from './harness';

describeScenario('reload', 'revalidacao ao vivo invalido -> valido (T7.4)', () => {
  it('popula a tree e limpa os diagnosticos sem recarregar a janela', async () => {
    const warn = stubShowWarningMessage();
    try {
      const api = await activateExtension();
      api.resetNotifier();
      await api.reload();
      assert.strictEqual(api.getLastResult().status, 'invalid');

      // Cria o markdown que faltava (step-02.md), tornando o tutorial valido.
      const folder = vscode.workspace.workspaceFolders![0].uri;
      const missing = vscode.Uri.joinPath(folder, 'step-02.md');
      await vscode.workspace.fs.writeFile(
        missing,
        Buffer.from('# Etapa 2\n\nConteudo adicionado em tempo de execucao.\n', 'utf8')
      );

      // O watcher deve reagir (debounce ~200ms) em ~1s.
      await waitFor(() => api.getLastResult().status === 'ok', 3000);

      const roots = api.treeProvider.getChildren();
      assert.strictEqual(roots[0].kind, 'root');
      assert.ok(api.treeProvider.getChildren(roots[0]).length >= 1);

      await waitFor(
        () => vscode.languages.getDiagnostics(indexUri()).length === 0,
        3000
      );
    } finally {
      warn.restore();
    }
  });
});
