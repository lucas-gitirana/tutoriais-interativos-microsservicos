import { spawn } from 'node:child_process';

/** Resultado da checagem de sintaxe de um script bash. */
export interface BashSyntaxCheckResult {
  /** `false` quando `bash` nao esta disponivel no PATH (ex.: Windows sem Git Bash). */
  disponivel: boolean;
  /** `true` quando `bash -n` terminou sem erro de sintaxe. */
  ok: boolean;
  /** Primeira linha util do `stderr` do `bash -n`, quando `ok` e `false`. */
  mensagem?: string;
}

/**
 * Checa a sintaxe de um script bash **sem executa-lo**. A execucao real dos
 * scripts de verificacao pertence a UC04.
 */
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

      // EPIPE se o bash fechar a entrada antes de consumi-la — o evento 'close'
      // ja carrega o resultado.
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
