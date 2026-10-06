import { FileTarget } from '../model/tutorial';

export interface EditorOpener {
  openBeside(relativePath: string, line0Based?: number): Promise<void>;
  close(relativePath: string): Promise<void>;
}

/**
 * Abre o arquivo/linha de uma etapa ao lado do painel do
 * tutorial. Ao trocar de etapa, fecha o arquivo aberto pela etapa
 * anterior para que os editores nao fiquem se acumulando.
 */
export class FileNavigationService {
  private opened: string | undefined;

  constructor(private readonly opener: EditorOpener) {}

  async openFile(target: FileTarget): Promise<void> {
    if (this.opened !== undefined && this.opened !== target.name) {
      await this.closeOpened();
    }
    const line0Based = target.line !== undefined ? target.line - 1 : undefined;
    await this.opener.openBeside(target.name, line0Based);
    this.opened = target.name;
  }

  async closeOpened(): Promise<void> {
    const previous = this.opened;
    this.opened = undefined;
    if (previous !== undefined) {
      await this.opener.close(previous);
    }
  }
}
