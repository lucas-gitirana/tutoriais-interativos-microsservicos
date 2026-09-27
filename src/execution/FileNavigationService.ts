import { FileTarget } from '../model/tutorial';

export interface EditorOpener {
  openBeside(relativePath: string, line0Based?: number): Promise<void>;
}

/**
 * Abre o arquivo/linha de uma etapa ao lado do painel do
 * tutorial.
 */
export class FileNavigationService {
  constructor(private readonly opener: EditorOpener) {}

  async openFile(target: FileTarget): Promise<void> {
    const line0Based = target.line !== undefined ? target.line - 1 : undefined;
    await this.opener.openBeside(target.name, line0Based);
  }
}
