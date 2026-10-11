import * as assert from 'node:assert';
import { StepStatus } from '../../controller/types';
import {
  buildPerformanceRecord,
  fallbackFileContent,
  fallbackFileName,
  validateStudentName
} from '../../evaluation/PerformanceRecord';
import { TutorialDefinition } from '../../model/tutorial';

function tutorial(report?: TutorialDefinition['report']): TutorialDefinition {
  return {
    title: 'Implementando o padrão CQRS',
    description: 'd',
    details: {
      intro: { text: 'intro.md' },
      steps: [
        { title: 'Ler', text: 'a.md' },
        { title: 'Separar', text: 'b.md', verify: 'b.sh', points: 10 },
        { title: 'Projetar', text: 'c.md', verify: 'c.sh', points: 15 }
      ],
      finish: { text: 'finish.md' }
    },
    backend: { imageid: 'x/y:1' },
    report
  };
}

describe('validateStudentName (US07)', () => {
  it('normaliza espacos do nome', () => {
    assert.deepStrictEqual(validateStudentName('  Ana   Maria  Souza '), {
      ok: true,
      nome: 'Ana Maria Souza'
    });
  });

  const invalidos: Array<[string, RegExp]> = [
    ['', /informe seu nome/i],
    ['   ', /informe seu nome/i],
    ['A'.repeat(101), /máximo 100/]
  ];
  for (const [nome, message] of invalidos) {
    it(`rejeita nome=${JSON.stringify(nome.slice(0, 10))}`, () => {
      const result = validateStudentName(nome);
      assert.strictEqual(result.ok, false);
      assert.match((result as { message: string }).message, message);
    });
  }
});

describe('buildPerformanceRecord (US07)', () => {
  const statuses = new Map<number, StepStatus>([
    [0, StepStatus.COMPLETED],
    [1, StepStatus.COMPLETED],
    [2, StepStatus.FAILED]
  ]);
  const now = new Date('2026-10-11T14:00:00.000Z');

  it('reaproveita nota e resumo do ScoreTracker', () => {
    const record = buildPerformanceRecord(tutorial(), statuses, 'Ana', now);
    assert.deepStrictEqual(record, {
      tutorial: 'Implementando o padrão CQRS',
      nome: 'Ana',
      nota: 10,
      notaMaxima: 25,
      etapas: [
        { titulo: 'Ler', status: 'no-evaluation' },
        { titulo: 'Separar', status: 'correct' },
        { titulo: 'Projetar', status: 'incorrect' }
      ],
      concluidoEm: '2026-10-11T14:00:00.000Z'
    });
  });

  it('inclui o token quando configurado', () => {
    const record = buildPerformanceRecord(
      tutorial({ endpoint: 'https://exemplo.com', token: 'turma' }),
      statuses,
      'Ana',
      now
    );
    assert.strictEqual(record.token, 'turma');
  });

  it('arquivo de fallback tem nome previsivel e nao expoe o token', () => {
    const record = buildPerformanceRecord(
      tutorial({ endpoint: 'https://exemplo.com', token: 'turma' }),
      statuses,
      'Ana Maria Souza',
      now
    );
    assert.strictEqual(
      fallbackFileName(record),
      'resultado-implementando-o-padrao-cqrs-ana-maria-souza.json'
    );
    const content = JSON.parse(fallbackFileContent(record)) as Record<string, unknown>;
    assert.strictEqual(content.token, undefined);
    assert.strictEqual(content.nota, 10);
  });
});
