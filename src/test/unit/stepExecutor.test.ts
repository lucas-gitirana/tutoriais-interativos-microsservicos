import * as assert from 'node:assert';
import { EditorOpener, FileNavigationService } from '../../execution/FileNavigationService';
import { StepExecutor } from '../../execution/StepExecutor';
import { TerminalFactory, TerminalHandle, TerminalService } from '../../execution/TerminalService';
import { ScriptReader } from '../../fs/ScriptReader';
import { MarkdownRenderer } from '../../markdown/MarkdownRenderer';

class FakeReader implements ScriptReader {
  constructor(private readonly files: Record<string, string>) {}
  read(relativePath: string): Promise<string | undefined> {
    return Promise.resolve(this.files[relativePath]);
  }
}

class FakeEditorOpener implements EditorOpener {
  calls: Array<{ relativePath: string; line0Based?: number }> = [];
  openBeside(relativePath: string, line0Based?: number): Promise<void> {
    this.calls.push({ relativePath, line0Based });
    return Promise.resolve();
  }
}

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
  handle = new FakeTerminalHandle();
  create(): TerminalHandle {
    return this.handle;
  }
}

function buildExecutor(files: Record<string, string>): {
  executor: StepExecutor;
  fileNav: FakeEditorOpener;
  terminal: FakeTerminalFactory;
} {
  const fileNav = new FakeEditorOpener();
  const terminalFactory = new FakeTerminalFactory();
  const executor = new StepExecutor({
    reader: new FakeReader(files),
    markdown: new MarkdownRenderer(),
    fileNav: new FileNavigationService(fileNav),
    terminal: new TerminalService(terminalFactory)
  });
  return { executor, fileNav, terminal: terminalFactory };
}

describe('StepExecutor', () => {
  it('openStep sem file: so renderiza o markdown', async () => {
    const { executor, fileNav } = buildExecutor({ 'step-01.md': '# Etapa 1' });
    const result = await executor.openStep({ title: 'Etapa 1', text: 'step-01.md' });
    assert.match(result.html, /<h1>Etapa 1<\/h1>/);
    assert.strictEqual(fileNav.calls.length, 0);
  });

  it('openStep com file: abre o arquivo antes de renderizar (CA-6)', async () => {
    const { executor, fileNav } = buildExecutor({ 'step-01.md': '# Etapa 1' });
    await executor.openStep({
      title: 'Etapa 1',
      text: 'step-01.md',
      file: { name: 'src/app.py', line: 12 }
    });
    assert.deepStrictEqual(fileNav.calls, [{ relativePath: 'src/app.py', line0Based: 11 }]);
  });

  it('openTextBlock sem background: nao aciona o terminal', async () => {
    const { executor, terminal } = buildExecutor({ 'intro.md': 'Ola' });
    await executor.openTextBlock({ text: 'intro.md' });
    assert.deepStrictEqual(terminal.handle.sent, []);
  });

  it('openTextBlock com background: dispara o script automaticamente (RF09)', async () => {
    const { executor, terminal } = buildExecutor({
      'intro.md': 'Ola',
      'setup.sh': '#!/usr/bin/env bash\necho ola'
    });
    await executor.openTextBlock({ text: 'intro.md', background: 'setup.sh' });
    assert.deepStrictEqual(terminal.handle.sent, ['#!/usr/bin/env bash\necho ola']);
  });
});
