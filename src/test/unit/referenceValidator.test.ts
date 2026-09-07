import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NodeFileProbe } from '../../fs/NodeFileProbe';
import { JsonSource } from '../../loading/JsonSource';
import { ReferenceValidator } from '../../loading/ReferenceValidator';
import { TutorialDefinition } from '../../model/tutorial';
import { FIXTURES } from './helpers';

function loadFixture(name: string): { tutorial: TutorialDefinition; source: JsonSource } {
  const dir = path.join(FIXTURES, name);
  const text = fs.readFileSync(path.join(dir, 'index.json'), 'utf8');
  return {
    tutorial: JSON.parse(text) as TutorialDefinition,
    source: JsonSource.parse(text).source
  };
}

function validate(name: string) {
  const dir = path.join(FIXTURES, name);
  const { tutorial, source } = loadFixture(name);
  return new ReferenceValidator(new NodeFileProbe(dir)).validate(tutorial, source);
}

describe('ReferenceValidator', () => {
  it('valid-tutorial: nenhum problema', async () => {
    const errors = await validate('valid-tutorial');
    assert.deepStrictEqual(errors, []);
  });

  it('invalid-missing-markdown: 1 erro apontando o markdown ausente', async () => {
    const errors = await validate('invalid-missing-markdown');
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'error');
    assert.strictEqual(errors[0].path, '/details/steps/1/text');
    assert.match(errors[0].message, /step-02\.md/);
    assert.ok(errors[0].range, 'erro deve carregar o range no index.json');
  });

  it('invalid-missing-verify-script: 1 erro no verify ausente', async () => {
    const errors = await validate('invalid-missing-verify-script');
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'error');
    assert.strictEqual(errors[0].path, '/details/steps/1/verify');
  });

  it('warn-missing-file-target: 1 aviso, nao bloqueante', async () => {
    const errors = await validate('warn-missing-file-target');
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'warning');
    assert.strictEqual(errors[0].path, '/details/steps/0/file/name');
    assert.strictEqual(errors.filter((e) => e.severity === 'error').length, 0);
  });
});
