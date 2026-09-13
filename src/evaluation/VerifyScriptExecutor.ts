/** Resultado bruto de rodar um script de verificacao (antes de virar `VerificationResult`). */
export interface VerifyRunResult {
  /** `null` quando o processo foi morto (timeout) ou nao pode ser iniciado (ex.: `bash` ausente). */
  exitCode: number | null;
  /** stdout + stderr combinados, na ordem em que chegaram. */
  output: string;
  /** `true` quando o processo foi morto por estourar o tempo limite. */
  timedOut: boolean;
}

/**
 * Executa (de verdade, sem `-n`) um script de verificacao de etapa. Implementado sobre
 * `child_process`, headless — nao aparece no terminal integrado visivel ao usuario (ver decisao
 * de arquitetura em `.claude/plano/US04-executar-avaliacoes-automaticas.md`, secao 1).
 */
export interface VerifyScriptExecutor {
  run(absoluteScriptPath: string, cwd: string): Promise<VerifyRunResult>;
}
