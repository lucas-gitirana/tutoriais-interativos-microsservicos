import * as assert from 'node:assert';
import { MarkdownRenderer } from '../../markdown/MarkdownRenderer';

function decodeCommand(html: string): string {
  const match = html.match(/data-command-b64="([^"]+)"/);
  assert.ok(match, `botao de comando nao encontrado no HTML: ${html}`);
  return Buffer.from(match![1], 'base64').toString('utf8');
}

describe('MarkdownRenderer', () => {
  const renderer = new MarkdownRenderer();

  it('bloco ```bash vira botao de executar com o comando exato', () => {
    const html = renderer.render('```bash\ndocker ps\n```');
    assert.match(html, /tutoriais-cmd-run/);
    assert.strictEqual(decodeCommand(html), 'docker ps');
  });

  it('bloco ```sh e ```shell tambem viram botao', () => {
    assert.match(renderer.render('```sh\nls -la\n```'), /tutoriais-cmd-run/);
    assert.match(renderer.render('```shell\npwd\n```'), /tutoriais-cmd-run/);
  });

  it('comando de multiplas linhas e preservado integralmente', () => {
    const script = 'echo "passo 1"\necho "passo 2"';
    const html = renderer.render('```bash\n' + script + '\n```');
    assert.strictEqual(decodeCommand(html), script);
  });

  it('bloco em outra linguagem nao ganha botao', () => {
    const html = renderer.render('```json\n{"a": 1}\n```');
    assert.doesNotMatch(html, /tutoriais-cmd-run/);
  });

  it('markdown sem blocos de codigo renderiza normalmente', () => {
    const html = renderer.render('# Titulo\n\nTexto simples.');
    assert.match(html, /<h1>Titulo<\/h1>/);
    assert.doesNotMatch(html, /tutoriais-cmd/);
  });

  it('imagem com caminho relativo e reescrita via resolveAssetUri', () => {
    const html = renderer.render('![diagrama](./img/diagrama.png)', {
      resolveAssetUri: (p) => `vscode-resource://${p}`
    });
    assert.match(html, /src="vscode-resource:\/\/\.\/img\/diagrama\.png"/);
  });

  it('imagem absoluta (http/https) nao e reescrita', () => {
    const html = renderer.render('![diagrama](https://exemplo.com/img.png)', {
      resolveAssetUri: (p) => `vscode-resource://${p}`
    });
    assert.match(html, /src="https:\/\/exemplo\.com\/img\.png"/);
  });

  it('sem resolveAssetUri, o caminho da imagem fica inalterado', () => {
    const html = renderer.render('![diagrama](./img/diagrama.png)');
    assert.match(html, /src="\.\/img\/diagrama\.png"/);
  });
});
