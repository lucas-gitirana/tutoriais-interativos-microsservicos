import * as vscode from 'vscode';
import { TutorialLoader } from '../loading/TutorialLoader';
import { LoadResult } from '../loading/types';

const DEBOUNCE_MS = 200;

/**
 * Observa o `index.json` e os arquivos de conteudo (`*.md` / `*.sh`) do diretorio
 * do tutorial. Qualquer criacao / alteracao / remocao dispara uma nova carga
 * (com debounce) e emite {@link TutorialWatcher.onDidReload} com o
 * {@link LoadResult} resultante — permitindo iterar sem recarregar a janela.
 */
export class TutorialWatcher implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<LoadResult>();
  /** Emitido apos cada recarga (inicial, manual ou por watcher). */
  readonly onDidReload = this.emitter.event;

  private readonly indexWatcher: vscode.FileSystemWatcher;
  private referenceWatcher: vscode.FileSystemWatcher | undefined;
  private debounce: NodeJS.Timeout | undefined;
  private disposed = false;

  constructor(private readonly loader: TutorialLoader) {
    this.indexWatcher = vscode.workspace.createFileSystemWatcher('**/index.json');
    this.indexWatcher.onDidChange(() => this.schedule());
    this.indexWatcher.onDidCreate(() => this.schedule());
    this.indexWatcher.onDidDelete(() => this.schedule());
  }

  /** Recarrega imediatamente, re-configura o watcher de conteudo e emite o evento. */
  async reloadNow(): Promise<LoadResult> {
    const result = await this.loader.loadFromWorkspace();
    this.rewireReferenceWatcher(result);
    if (!this.disposed) {
      this.emitter.fire(result);
    }
    return result;
  }

  private schedule(): void {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => {
      this.debounce = undefined;
      void this.reloadNow();
    }, DEBOUNCE_MS);
  }

  private rewireReferenceWatcher(result: LoadResult): void {
    this.referenceWatcher?.dispose();
    this.referenceWatcher = undefined;
    if (result.status === 'none') {
      return;
    }
    const tutorialDir = vscode.Uri.joinPath(result.indexUri, '..');
    const pattern = new vscode.RelativePattern(tutorialDir, '**/*.{md,sh}');
    this.referenceWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.referenceWatcher.onDidChange(() => this.schedule());
    this.referenceWatcher.onDidCreate(() => this.schedule());
    this.referenceWatcher.onDidDelete(() => this.schedule());
  }

  dispose(): void {
    this.disposed = true;
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.indexWatcher.dispose();
    this.referenceWatcher?.dispose();
    this.emitter.dispose();
  }
}
