import { FileTarget } from '../model/tutorial';

/** Abre um caminho relativo ao diretorio do tutorial num editor ao lado do painel. */
export interface EditorOpener {
  openBeside(relativePath: string, line0Based?: number): Promise<void>;
}

/**
 * Abre o arquivo/linha de uma etapa (CA-6, RF08) ao lado do painel do
 * tutorial. Converte `file.line` (1-based, JSON Schema de UC01) para a
 * indexacao 0-based do editor antes de delegar a abertura de fato ao
 * {@link EditorOpener} injetado — permite testar essa conversao sem o modulo
 * `vscode`.
 *
 * Corresponde a classe `FileNavigationService` do Diagrama de Classes.
 */
export class FileNavigationService {
  constructor(private readonly opener: EditorOpener) {}

  async openFile(target: FileTarget): Promise<void> {
    const line0Based = target.line !== undefined ? target.line - 1 : undefined;
    await this.opener.openBeside(target.name, line0Based);
  }
}
