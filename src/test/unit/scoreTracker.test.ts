import * as assert from 'node:assert';
import { StepStatus } from '../../controller/types';
import { getSummary, getTotalScore } from '../../evaluation/ScoreTracker';
import { Step } from '../../model/tutorial';

function makeStep(overrides: Partial<Step>): Step {
  return { title: 'Etapa', text: 'step.md', ...overrides };
}

describe('ScoreTracker', () => {
  const steps: Step[] = [
    makeStep({ title: 'Sem avaliacao' }), // a: sem verify
    makeStep({ title: 'Correta', verify: 'v1.sh', points: 10 }), // b: verify + points, COMPLETED
    makeStep({ title: 'Incorreta', verify: 'v2.sh', points: 5 }), // c: verify + points, FAILED
    makeStep({ title: 'Sem points', verify: 'v3.sh' }) // d: verify sem points, PENDING
  ];

  const statuses = new Map<number, StepStatus>([
    [1, StepStatus.COMPLETED],
    [2, StepStatus.FAILED]
    // indice 3 fica ausente do map (equivalente a PENDING)
  ]);

  it('getTotalScore soma so os pontos das etapas com verify e COMPLETED', () => {
    assert.deepStrictEqual(getTotalScore(steps, statuses), { total: 10, possible: 15 });
  });

  it('etapa com verify sem points conta como 0, sem quebrar o calculo', () => {
    const semPoints: Step[] = [makeStep({ verify: 'v.sh' })];
    const semStatus = new Map<number, StepStatus>();
    assert.deepStrictEqual(getTotalScore(semPoints, semStatus), { total: 0, possible: 0 });
  });

  it('getSummary retorna os 4 rotulos certos na ordem certa', () => {
    assert.deepStrictEqual(getSummary(steps, statuses), [
      { title: 'Sem avaliacao', status: 'no-evaluation' },
      { title: 'Correta', status: 'correct' },
      { title: 'Incorreta', status: 'incorrect' },
      { title: 'Sem points', status: 'not-evaluated' }
    ]);
  });
});
