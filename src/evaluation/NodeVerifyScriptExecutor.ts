import { spawn } from 'node:child_process';
import { VerifyRunResult, VerifyScriptExecutor } from './VerifyScriptExecutor';

/** Tempo maximo (ms) que um script de verificacao pode rodar antes de ser morto. */
export const VERIFY_TIMEOUT_MS = 60_000;

/**
 * {@link VerifyScriptExecutor} sobre `child_process.spawn('bash', [caminho])` — mesmo molde do
 * `NodeBashSyntaxChecker` (US02), mas executando o script de verdade (sem `-n`) e com `cwd`
 * definido como o diretorio do tutorial.
 */
export class NodeVerifyScriptExecutor implements VerifyScriptExecutor {
  /**
   * `command` e configuravel so para permitir simular 'bash ausente' (`ENOENT`) em teste, com um
   * nome de binario inexistente — em producao e sempre `'bash'` (valor padrao).
   */
  constructor(
    private readonly timeoutMs: number = VERIFY_TIMEOUT_MS,
    private readonly command: string = 'bash'
  ) {}

  run(absoluteScriptPath: string, cwd: string): Promise<VerifyRunResult> {
    return new Promise((resolve) => {
      let settled = false;
      const chunks: string[] = [];

      const finish = (result: VerifyRunResult): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      const child = spawn(this.command, [absoluteScriptPath], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        finish({ exitCode: null, output: chunks.join(''), timedOut: true });
      }, this.timeoutMs);

      child.stdout?.on('data', (chunk) => chunks.push(String(chunk)));
      child.stderr?.on('data', (chunk) => chunks.push(String(chunk)));

      child.on('error', () => {
        finish({ exitCode: null, output: chunks.join(''), timedOut: false });
      });

      child.on('close', (code) => {
        finish({ exitCode: code, output: chunks.join(''), timedOut: false });
      });
    });
  }
}
