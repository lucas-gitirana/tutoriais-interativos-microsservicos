/**
 * Resultado de uma verificacao automatica de etapa (UC04, RF11-RF13). Corresponde a classe
 * `VerificationResult` do Diagrama de Classes (`.claude/diagrams/diagramas.md`).
 *
 * `expectedOutput` so esta presente quando `success` e `false`: por convencao (sem campo novo
 * no JSON Schema de UC01), e o stdout+stderr que o proprio script `verify` imprimiu ao falhar —
 * o script deve explicar o que era esperado quando termina com erro.
 */
export interface VerificationResult {
  success: boolean;
  output: string;
  expectedOutput?: string;
}
