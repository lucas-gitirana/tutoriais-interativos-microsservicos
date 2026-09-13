import { StepStatus } from '../controller/types';
import { Step } from '../model/tutorial';

/** Estado de uma etapa no resumo da tela de finalizacao (RF16). */
export type FinishSummaryStatus = 'correct' | 'incorrect' | 'not-evaluated' | 'no-evaluation';

export interface FinishSummaryItem {
  title: string;
  status: FinishSummaryStatus;
}

/**
 * Calcula a nota final (RF15) e o resumo por etapa (RF16). Corresponde a classe `ScoreTracker`
 * do Diagrama de Classes, porem **sem** o `results: Map<Step, VerificationResult>` proprio que o
 * diagrama sugere: em vez de manter um segundo estado que precisaria ficar sincronizado com
 * `TutorialController.statuses`, essas sao funcoes puras que recebem `steps`+`statuses` como
 * parametro — divergencia a registrar em `.claude/diagrams/diagramas.md` apos confirmacao do autor
 * (ver `.claude/plano/US04-executar-avaliacoes-automaticas.md`, secao 1).
 */
export function getTotalScore(
  steps: Step[],
  statuses: ReadonlyMap<number, StepStatus>
): { total: number; possible: number } {
  let total = 0;
  let possible = 0;
  steps.forEach((step, i) => {
    if (typeof step.verify !== 'string') {
      return;
    }
    const points = step.points ?? 0;
    possible += points;
    if (statuses.get(i) === StepStatus.COMPLETED) {
      total += points;
    }
  });
  return { total, possible };
}

export function getSummary(
  steps: Step[],
  statuses: ReadonlyMap<number, StepStatus>
): FinishSummaryItem[] {
  return steps.map((step, i) => {
    const hasVerify = typeof step.verify === 'string';
    if (!hasVerify) {
      return { title: step.title, status: 'no-evaluation' };
    }
    const status = statuses.get(i) ?? StepStatus.PENDING;
    if (status === StepStatus.COMPLETED) {
      return { title: step.title, status: 'correct' };
    }
    if (status === StepStatus.FAILED) {
      return { title: step.title, status: 'incorrect' };
    }
    return { title: step.title, status: 'not-evaluated' };
  });
}
