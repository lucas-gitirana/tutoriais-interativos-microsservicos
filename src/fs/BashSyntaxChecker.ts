import { spawn } from 'node:child_process';

export interface BashSyntaxCheckResult {
  disponivel: boolean;
  ok: boolean;
  mensagem?: string;
}

export interface BashSyntaxChecker {
  check(conteudo: string): Promise<BashSyntaxCheckResult>;
}

const TIMEOUT_MS = 5000;

/**
 * {@link BashSyntaxChecker} que roda `bash -n` (modo *noexec*: apenas analise
 * sintatica) sobre o conteudo do script, passado por *stdin* — nao depende de o
 * arquivo estar em disco local, entao funciona tambem em Codespaces / remoto.
 */
export class NodeBashSyntaxChecker implements BashSyntaxChecker {
  check(conteudo: string): Promise<BashSyntaxCheckResult> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (r: BashSyntaxCheckResult): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(r);
      };

      const child = spawn('bash', ['-n'], { stdio: ['pipe', 'ignore', 'pipe'] });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        finish({ disponivel: false, ok: false, mensagem: 'tempo esgotado ao checar a sintaxe' });
      }, TIMEOUT_MS);

      let stderr = '';
      child.stderr?.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.on('error', (err: NodeJS.ErrnoException) => {
        finish({
          disponivel: false,
          ok: false,
          mensagem: err.code === 'ENOENT' ? undefined : err.message
        });
      });

      child.on('close', (code) => {
        finish(
          code === 0
            ? { disponivel: true, ok: true }
            : { disponivel: true, ok: false, mensagem: firstUsefulLine(stderr) }
        );
      });

      child.stdin?.on('error', () => undefined);
      child.stdin?.end(conteudo);
    });
  }
}

function firstUsefulLine(stderr: string): string {
  const linha = stderr
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return (linha ?? 'erro de sintaxe nao especificado').replace(/^bash:\s*/i, '');
}
