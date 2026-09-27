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
 * Roda o script `verify` de uma etapa e produz um {@link VerificationResult}
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
