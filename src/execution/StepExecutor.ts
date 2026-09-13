import { ScriptReader } from '../fs/ScriptReader';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { Step, TextBlock } from '../model/tutorial';
import { FileNavigationService } from './FileNavigationService';
import { TerminalService } from './TerminalService';

/** Conteudo pronto para o `TutorialWebviewPanel` exibir. */
export interface RenderedContent {
  html: string;
}

export interface StepExecutorDeps {
  /** Le o markdown/scripts, ja vinculado ao diretorio do tutorial (US01: `ScriptReader`). */
  reader: ScriptReader;
  markdown: MarkdownRenderer;
  fileNav: FileNavigationService;
  terminal: TerminalService;
  /** Resolve caminhos relativos de imagem para uma URI utilizavel pelo webview. */
  resolveAssetUri?: (relativePath: string) => string;
}

/**
 * Prepara o conteudo de uma etapa/introducao/finalizacao para o
 * `TutorialWebviewPanel`: le e renderiza o markdown (com botoes de comando,
 * CA-7), abre o `FileTarget` ao lado quando presente (CA-6) e dispara o
 * `background` automaticamente (RF09) quando houver.
 *
 * Corresponde a classe `StepExecutor` do Diagrama de Classes.
 */
export class StepExecutor {
  constructor(private readonly deps: StepExecutorDeps) {}

  /** Abre uma etapa do tutorial (CA-3, CA-6). */
  async openStep(step: Step): Promise<RenderedContent> {
    if (step.file) {
      await this.deps.fileNav.openFile(step.file);
    }
    return this.renderBlock(step.text);
  }

  /** Renderiza a introducao ou a finalizacao, disparando `background` se houver (RF09). */
  async openTextBlock(block: TextBlock): Promise<RenderedContent> {
    const rendered = await this.renderBlock(block.text);
    if (block.background) {
      const script = await this.deps.reader.read(block.background);
      if (script !== undefined) {
        this.deps.terminal.runCommand(script);
      }
    }
    return rendered;
  }

  private async renderBlock(relativePath: string): Promise<RenderedContent> {
    const content = (await this.deps.reader.read(relativePath)) ?? '';
    return {
      html: this.deps.markdown.render(content, { resolveAssetUri: this.deps.resolveAssetUri })
    };
  }
}
