import MarkdownIt from 'markdown-it';

const COMMAND_LANGUAGES = new Set(['bash', 'sh', 'shell']);

export interface MarkdownRenderOptions {
  /**
   * Resolve um caminho relativo de imagem (citado no markdown) para uma URI
   * utilizavel pelo webview (`vscode.Webview.asWebviewUri`). Sem essa opcao,
   * caminhos relativos sao deixados como estao (uteis em teste unitario).
   */
  resolveAssetUri?: (relativePath: string) => string;
}

/**
 * Converte o markdown de uma etapa/introducao/finalizacao (`TextBlock.text`
 * do JSON Schema de UC01) em HTML para o `TutorialWebviewPanel`.
 *
 * Injeta um botao "Executar" em blocos de codigo com linguagem `bash`/`sh`/
 * `shell` (CA-7 da US03) — a forma escolhida de identificar "comando de
 * terminal presente no conteudo da etapa" sem alterar o JSON Schema de UC01.
 * Blocos em outras linguagens sao so exibidos, sem botao.
 *
 * Puro (sem dependencia do modulo `vscode`): a resolucao de URI de imagem e
 * injetada via {@link MarkdownRenderOptions.resolveAssetUri}, o que permite
 * testar a classe fora do Extension Host.
 */
export class MarkdownRenderer {
  private readonly md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({ html: false, linkify: true, breaks: false });
    this.installImageResolver();
    this.installCommandButtons();
  }

  render(markdown: string, options: MarkdownRenderOptions = {}): string {
    return this.md.render(markdown, { resolveAssetUri: options.resolveAssetUri });
  }

  private installImageResolver(): void {
    const defaultRule =
      this.md.renderer.rules.image ??
      ((
        tokens: MarkdownIt.Token[],
        idx: number,
        opts: MarkdownIt.Options,
        _env: unknown,
        self: MarkdownIt.Renderer
      ) => self.renderToken(tokens, idx, opts));

    this.md.renderer.rules.image = (tokens, idx, opts, env, self) => {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');
      const resolve = (env as { resolveAssetUri?: (p: string) => string } | undefined)
        ?.resolveAssetUri;
      if (srcIndex >= 0 && resolve && token.attrs) {
        const original = token.attrs[srcIndex][1];
        if (!isAbsoluteUrl(original)) {
          token.attrs[srcIndex][1] = resolve(original);
        }
      }
      return defaultRule(tokens, idx, opts, env, self);
    };
  }

  private installCommandButtons(): void {
    const defaultFence = this.md.renderer.rules.fence!;
    this.md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
      const token = tokens[idx];
      const lang = token.info.trim().split(/\s+/)[0]?.toLowerCase();
      const html = defaultFence(tokens, idx, opts, env, self);
      if (!lang || !COMMAND_LANGUAGES.has(lang)) {
        return html;
      }
      const command = token.content.replace(/\n$/, '');
      const encoded = Buffer.from(command, 'utf8').toString('base64');
      return (
        `<div class="tutoriais-cmd">${html}` +
        `<button class="tutoriais-cmd-run" data-command-b64="${encoded}">▶ Executar</button>` +
        `</div>`
      );
    };
  }
}

function isAbsoluteUrl(src: string): boolean {
  return /^([a-z][a-z0-9+.-]*:)?\/\//i.test(src) || src.startsWith('data:');
}
