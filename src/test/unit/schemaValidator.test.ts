import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TutorialSchemaValidator } from '../../loading/TutorialSchemaValidator';
import { FIXTURES } from './helpers';

const validator = new TutorialSchemaValidator();

function load(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, rel), 'utf8'));
}

describe('TutorialSchemaValidator', () => {
  it('aceita um index.json valido', () => {
    const result = validator.validate(load('valid-tutorial/index.json'));
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  const casos: Array<{
    file: string;
    count: number;
    path: string;
    message: RegExp;
  }> = [
    { file: 'schema-invalid/missing-title.json', count: 1, path: '/title', message: /obrigat/i },
    {
      file: 'schema-invalid/missing-description.json',
      count: 1,
      path: '/description',
      message: /obrigat/i
    },
    { file: 'schema-invalid/missing-details.json', count: 1, path: '/details', message: /obrigat/i },
    { file: 'schema-invalid/missing-backend.json', count: 1, path: '/backend', message: /obrigat/i },
    {
      file: 'schema-invalid/backend-missing-imageid.json',
      count: 1,
      path: '/backend/imageid',
      message: /obrigat/i
    },
    {
      file: 'schema-invalid/empty-steps.json',
      count: 1,
      path: '/details/steps',
      message: /minimo/i
    },
    {
      file: 'schema-invalid/additional-property.json',
      count: 1,
      path: '/extra',
      message: /reconhecid/i
    },
    {
      file: 'schema-invalid/points-as-string.json',
      count: 1,
      path: '/details/steps/0/points',
      message: /tipo invalido/i
    },
    {
      file: 'schema-invalid/file-line-zero.json',
      count: 1,
      path: '/details/steps/0/file/line',
      message: /maior ou igual/i
    },
    {
      file: 'schema-invalid/step-missing-text.json',
      count: 1,
      path: '/details/steps/0/text',
      message: /obrigat/i
    },
    {
      file: 'schema-invalid/verify-as-array.json',
      count: 1,
      path: '/details/steps/0/verify',
      message: /tipo invalido/i
    },
    {
      file: 'schema-invalid/verify-as-number.json',
      count: 1,
      path: '/details/steps/0/verify',
      message: /tipo invalido/i
    },
    {
      file: 'schema-invalid/report-missing-endpoint.json',
      count: 1,
      path: '/report/endpoint',
      message: /obrigat/i
    },
    {
      file: 'schema-invalid/report-endpoint-not-http.json',
      count: 1,
      path: '/report/endpoint',
      message: /padrao esperado/i
    },
    {
      file: 'schema-invalid/report-additional-property.json',
      count: 1,
      path: '/report/planilha',
      message: /reconhecid/i
    }
  ];

  for (const caso of casos) {
    it(`rejeita ${path.basename(caso.file)}`, () => {
      const result = validator.validate(load(caso.file));
      assert.strictEqual(result.valid, false);
      assert.strictEqual(
        result.errors.length,
        caso.count,
        `erros: ${JSON.stringify(result.errors, null, 2)}`
      );
      assert.strictEqual(result.errors[0].path, caso.path);
      assert.strictEqual(result.errors[0].severity, 'error');
      assert.match(result.errors[0].message, caso.message);
    });
  }

  it('aceita report com endpoint https e token', () => {
    const json = load('valid-tutorial/index.json') as Record<string, unknown>;
    json.report = { endpoint: 'https://script.google.com/macros/s/abc/exec', token: 'turma' };
    assert.deepStrictEqual(validator.validate(json).errors, []);
  });

  it('rejeita endpoint que nao e URL', () => {
    const json = load('valid-tutorial/index.json') as Record<string, unknown>;
    json.report = { endpoint: 'nao e url' };
    const result = validator.validate(json);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => /URL valida/.test(e.message)));
  });

  it('reporta multiplos erros com allErrors', () => {
    const result = validator.validate({ title: 'x' });
    // Faltam description, details e backend.
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length >= 3);
  });
});
