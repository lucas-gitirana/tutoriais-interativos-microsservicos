import * as path from 'node:path';
import { TerminalService } from '../execution/TerminalService';
import { splitRelativeSegments } from '../fs/pathUtils';
import { Step } from '../model/tutorial';
import { VerificationResult } from './types';
import { VerifyScriptExecutor } from './VerifyScriptExecutor';

const HEARTBEAT_COMMAND = 'echo "› Executando verificação da etapa..."';
const TIMEOUT_MESSAGE = 'A verificação demorou demais e foi interrompida. Tente novamente.';
const NO_OUTPUT_MESSAGE =
  'O script de verificação não produziu nenhuma saída — verifique se ele imprime uma mensagem explicando o que era esperado.';

export interface EvaluationRunnerDeps {
  executor: VerifyScriptExecutor;
  terminal: TerminalService;
}

/**
 * Roda o script `verify` de uma etapa e produz um {@link VerificationResult} (CA-1, CA-2, CA-4 da
 * US04). Corresponde a classe `EvaluationRunner` do Diagrama de Classes; diverge dele ao usar um
 * {@link VerifyScriptExecutor} headless (em vez de só `TerminalService`) para obter o resultado —
 * ver decisao de arquitetura em `.claude/plano/US04-executar-avaliacoes-automaticas.md`, secao 1.
 *
 * Nao conhece `vscode` — recebe `tutorialDir` como caminho de sistema de arquivos comum (string),
 * nao `vscode.Uri`, para poder ser testado fora do Extension Host (mesmo padrao de
 * `TerminalService`/`FileNavigationService`/`StepExecutor`). A resolucao do caminho relativo de
 * `step.verify` reaproveita `splitRelativeSegments` (`fs/pathUtils.ts`, ja sem dependencia de
 * `vscode`) em vez de `resolveRelative` (que trabalha com `vscode.Uri`).
 *
 * `TerminalService` e usado so para um "heartbeat" fixo e sem conteudo dinamico, dando
 * transparencia de que algo esta rodando sem reexecutar o script nem arriscar escapar saida
 * arbitraria dentro de um comando de shell.
 */
export class EvaluationRunner {
  constructor(private readonly deps: EvaluationRunnerDeps) {}

  async verify(step: Step, tutorialDir: string): Promise<VerificationResult> {
    const scriptPath = step.verify as string;
    const absolutePath = path.join(tutorialDir, ...splitRelativeSegments(scriptPath));

    this.deps.terminal.runCommand(HEARTBEAT_COMMAND);

    const run = await this.deps.executor.run(absolutePath, tutorialDir);

    if (run.timedOut) {
      return { success: false, output: run.output, expectedOutput: TIMEOUT_MESSAGE };
    }
    if (run.exitCode === 0) {
      return { success: true, output: run.output };
    }
    return {
      success: false,
      output: run.output,
      expectedOutput: run.output || NO_OUTPUT_MESSAGE
    };
  }
}
