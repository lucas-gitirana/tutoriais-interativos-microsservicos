import { ScriptReader } from '../fs/ScriptReader';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { Step, TextBlock } from '../model/tutorial';
import { FileNavigationService } from './FileNavigationService';
import { TerminalService } from './TerminalService';

export interface RenderedContent {
  html: string;
}

export interface StepExecutorDeps {
  reader: ScriptReader;
  markdown: MarkdownRenderer;
  fileNav: FileNavigationService;
  terminal: TerminalService;
  resolveAssetUri?: (relativePath: string) => string;
}

/**
 * Prepara o conteudo de uma etapa/introducao/finalizacao para o
 * `TutorialWebviewPanel`: 
 * 
 * - le e renderiza o markdown
 * - abre o `FileTarget` ao lado quando presente
 * - dispara o `background` automaticamente quando houver.
 */
export class StepExecutor {
  constructor(private readonly deps: StepExecutorDeps) {}
  
  async openStep(step: Step): Promise<RenderedContent> {
    if (step.file) {
      await this.deps.fileNav.openFile(step.file);
    }
    return this.renderBlock(step.text);
  }

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
