import * as assert from 'node:assert';
import { EditorOpener, FileNavigationService } from '../../execution/FileNavigationService';

class FakeEditorOpener implements EditorOpener {
  calls: Array<{ relativePath: string; line0Based?: number }> = [];
  closed: string[] = [];

  openBeside(relativePath: string, line0Based?: number): Promise<void> {
    this.calls.push({ relativePath, line0Based });
    return Promise.resolve();
  }

  close(relativePath: string): Promise<void> {
    this.closed.push(relativePath);
    return Promise.resolve();
  }
}

describe('FileNavigationService', () => {
  it('file.line presente: converte de 1-based (schema) para 0-based (editor)', async () => {
    const opener = new FakeEditorOpener();
    await new FileNavigationService(opener).openFile({ name: 'src/app.py', line: 1 });
    assert.deepStrictEqual(opener.calls, [{ relativePath: 'src/app.py', line0Based: 0 }]);
  });

  it('file.line = 12 vira linha 11 (0-based)', async () => {
    const opener = new FakeEditorOpener();
    await new FileNavigationService(opener).openFile({ name: 'src/app.py', line: 12 });
    assert.strictEqual(opener.calls[0].line0Based, 11);
  });

  it('file.line ausente: abre sem selecao especifica', async () => {
    const opener = new FakeEditorOpener();
    await new FileNavigationService(opener).openFile({ name: 'README.md' });
    assert.deepStrictEqual(opener.calls, [{ relativePath: 'README.md', line0Based: undefined }]);
  });

  it('arquivo diferente na etapa seguinte: fecha o anterior antes de abrir o novo', async () => {
    const opener = new FakeEditorOpener();
    const nav = new FileNavigationService(opener);
    await nav.openFile({ name: 'a.py' });
    await nav.openFile({ name: 'b.py' });
    assert.deepStrictEqual(opener.closed, ['a.py']);
  });

  it('mesmo arquivo na etapa seguinte: nao fecha, so reposiciona', async () => {
    const opener = new FakeEditorOpener();
    const nav = new FileNavigationService(opener);
    await nav.openFile({ name: 'a.py', line: 1 });
    await nav.openFile({ name: 'a.py', line: 10 });
    assert.deepStrictEqual(opener.closed, []);
    assert.strictEqual(opener.calls.length, 2);
  });

  it('closeOpened fecha o ultimo arquivo uma unica vez', async () => {
    const opener = new FakeEditorOpener();
    const nav = new FileNavigationService(opener);
    await nav.openFile({ name: 'a.py' });
    await nav.closeOpened();
    await nav.closeOpened();
    assert.deepStrictEqual(opener.closed, ['a.py']);
  });
});
