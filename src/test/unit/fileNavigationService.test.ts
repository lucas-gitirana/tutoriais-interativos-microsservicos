import * as assert from 'node:assert';
import { EditorOpener, FileNavigationService } from '../../execution/FileNavigationService';

class FakeEditorOpener implements EditorOpener {
  calls: Array<{ relativePath: string; line0Based?: number }> = [];

  openBeside(relativePath: string, line0Based?: number): Promise<void> {
    this.calls.push({ relativePath, line0Based });
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
});
