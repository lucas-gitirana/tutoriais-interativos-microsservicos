import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BashSyntaxChecker, BashSyntaxCheckResult } from '../../fs/BashSyntaxChecker';
import { NodeScriptReader } from '../../fs/NodeScriptReader';
import {
  checkPointsCoherence,
  checkReportEndpoint,
  checkSingleVerifyKey,
  runEvaluationChecks
} from '../../loading/EvaluationChecks';
import { JsonSource } from '../../loading/JsonSource';
import { VerifyScriptValidator } from '../../loading/VerifyScriptValidator';
import { TutorialDefinition } from '../../model/tutorial';
import { FIXTURES } from './helpers';

const OK: BashSyntaxCheckResult = { disponivel: true, ok: true };

class FakeBash implements BashSyntaxChecker {
  check(): Promise<BashSyntaxCheckResult> {
    return Promise.resolve(OK);
  }
}

function tutorial(steps: TutorialDefinition['details']['steps']): TutorialDefinition {
  return {
    title: 't',
    description: 'd',
    details: {
      intro: { text: 'intro.md' },
      steps,
      finish: { text: 'finish.md' }
    },
    backend: { imageid: 'x/y:1' }
  };
}

function fixture(name: string): { tutorial: TutorialDefinition; source: JsonSource } {
  const text = fs.readFileSync(path.join(FIXTURES, name, 'index.json'), 'utf8');
  return {
    tutorial: JSON.parse(text) as TutorialDefinition,
    source: JsonSource.parse(text).source
  };
}

describe('checkReportEndpoint (US07)', () => {
  const base = tutorial([{ title: 'E1', text: 'a.md' }]);

  it('sem report: sem avisos', () => {
    assert.deepStrictEqual(checkReportEndpoint(base), []);
  });

  it('endpoint https: sem avisos', () => {
    assert.deepStrictEqual(
      checkReportEndpoint({ ...base, report: { endpoint: 'https://exemplo.com/r' } }),
      []
    );
  });

  it('endpoint http: 1 aviso em /report/endpoint', () => {
    const errs = checkReportEndpoint({ ...base, report: { endpoint: 'http://exemplo.com/r' } });
    assert.strictEqual(errs.length, 1);
    assert.strictEqual(errs[0].severity, 'warning');
    assert.strictEqual(errs[0].path, '/report/endpoint');
    assert.match(errs[0].message, /HTTPS/);
  });
});

describe('checkPointsCoherence (RF14)', () => {
  it('verify sem points: 1 aviso na etapa', () => {
    const errs = checkPointsCoherence(tutorial([{ title: 'E1', text: 'a.md', verify: 'a.sh' }]));
    assert.strictEqual(errs.length, 1);
    assert.strictEqual(errs[0].severity, 'warning');
    assert.strictEqual(errs[0].path, '/details/steps/0');
  });

  it('points sem verify: 1 aviso em points', () => {
    const errs = checkPointsCoherence(tutorial([{ title: 'E1', text: 'a.md', points: 5 }]));
    assert.strictEqual(errs.length, 1);
    assert.strictEqual(errs[0].severity, 'warning');
    assert.strictEqual(errs[0].path, '/details/steps/0/points');
  });

  it('verify + points: sem avisos', () => {
    const errs = checkPointsCoherence(
      tutorial([{ title: 'E1', text: 'a.md', verify: 'a.sh', points: 5 }])
    );
    assert.deepStrictEqual(errs, []);
  });

  it('nem verify nem points: sem avisos', () => {
    const errs = checkPointsCoherence(tutorial([{ title: 'E1', text: 'a.md' }]));
    assert.deepStrictEqual(errs, []);
  });
});

describe('checkSingleVerifyKey (CA-2)', () => {
  it('etapa com duas chaves verify: 1 erro', () => {
    const text =
      '{"title":"t","description":"d","details":{"intro":{"text":"i.md"},' +
      '"steps":[{"title":"E1","text":"a.md","verify":"a.sh","verify":"b.sh"}],' +
      '"finish":{"text":"f.md"}},"backend":{"imageid":"x/y:1"}}';
    const { source } = JsonSource.parse(text);
    const errs = checkSingleVerifyKey(source);
    assert.strictEqual(errs.length, 1);
    assert.strictEqual(errs[0].severity, 'error');
    assert.strictEqual(errs[0].path, '/details/steps/0/verify');
  });

  it('etapa com um verify: sem erro', () => {
    const { source } = JsonSource.parse(
      fs.readFileSync(path.join(FIXTURES, 'valid-tutorial', 'index.json'), 'utf8')
    );
    assert.deepStrictEqual(checkSingleVerifyKey(source), []);
  });
});

describe('runEvaluationChecks', () => {
  function validator(dir: string): VerifyScriptValidator {
    return new VerifyScriptValidator(new NodeScriptReader(path.join(FIXTURES, dir)), new FakeBash());
  }

  it('valid-tutorial: nenhum problema', async () => {
    const { tutorial: t, source } = fixture('valid-tutorial');
    assert.deepStrictEqual(await runEvaluationChecks(t, validator('valid-tutorial'), source), []);
  });

  it('invalid-verify-not-sh: 1 erro de CA-1', async () => {
    const { tutorial: t, source } = fixture('invalid-verify-not-sh');
    const errs = await runEvaluationChecks(t, validator('invalid-verify-not-sh'), source);
    assert.strictEqual(errs.filter((e) => e.severity === 'error').length, 1);
    assert.strictEqual(errs[0].path, '/details/steps/0/verify');
  });

  it('warn-verify-without-points: 1 aviso, nenhum erro', async () => {
    const { tutorial: t, source } = fixture('warn-verify-without-points');
    const errs = await runEvaluationChecks(t, validator('warn-verify-without-points'), source);
    assert.strictEqual(errs.filter((e) => e.severity === 'error').length, 0);
    assert.strictEqual(errs.filter((e) => e.severity === 'warning').length, 1);
  });
});
