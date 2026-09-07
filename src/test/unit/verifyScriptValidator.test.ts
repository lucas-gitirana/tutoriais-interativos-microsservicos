import * as assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import {
  BashSyntaxChecker,
  BashSyntaxCheckResult,
  NodeBashSyntaxChecker
} from '../../fs/BashSyntaxChecker';
import { NodeScriptReader } from '../../fs/NodeScriptReader';
import { VerifyScriptValidator } from '../../loading/VerifyScriptValidator';
import { Step, TextBlock } from '../../model/tutorial';
import { FIXTURES } from './helpers';

const OK: BashSyntaxCheckResult = { disponivel: true, ok: true };

/** {@link BashSyntaxChecker} deterministico que conta as invocacoes. */
class FakeBash implements BashSyntaxChecker {
  public calls = 0;
  constructor(private readonly resultado: BashSyntaxCheckResult = OK) {}
  check(): Promise<BashSyntaxCheckResult> {
    this.calls++;
    return Promise.resolve(this.resultado);
  }
}

function validatorFor(fixtureDir: string, bash: BashSyntaxChecker): VerifyScriptValidator {
  return new VerifyScriptValidator(new NodeScriptReader(path.join(FIXTURES, fixtureDir)), bash);
}

function step(verify: string | undefined): Step {
  return { title: 'Etapa 1', text: 'step-01.md', verify };
}

const P = '/details/steps/0/verify';

function bashAvailable(): boolean {
  return spawnSync('bash', ['-c', 'true'], { stdio: 'ignore' }).status === 0;
}

describe('VerifyScriptValidator', () => {
  it('sem verify: nenhum problema', async () => {
    const errors = await validatorFor('valid-tutorial', new FakeBash()).validate(step(undefined), P);
    assert.deepStrictEqual(errors, []);
  });

  it('verify .sh com shebang bash e sintaxe ok: nenhum problema', async () => {
    const errors = await validatorFor('valid-tutorial', new FakeBash(OK)).validate(
      step('verify-step-01.sh'),
      P
    );
    assert.deepStrictEqual(errors, []);
  });

  it('verify com extensao .py: erro (CA-1), sem chamar o bash', async () => {
    const fake = new FakeBash();
    const errors = await validatorFor('invalid-verify-not-sh', fake).validate(
      step('verify-step-01.py'),
      P
    );
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'error');
    assert.strictEqual(errors[0].path, P);
    assert.match(errors[0].message, /\.sh/);
    assert.strictEqual(fake.calls, 0);
  });

  it('verify sem extensao: erro (CA-1)', async () => {
    const errors = await validatorFor('valid-tutorial', new FakeBash()).validate(
      step('verify-step-01'),
      P
    );
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'error');
  });

  it('verify .sh sem shebang: aviso, nao bloqueia', async () => {
    const errors = await validatorFor('warn-verify-no-shebang', new FakeBash(OK)).validate(
      step('verify-step-01.sh'),
      P
    );
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'warning');
    assert.match(errors[0].message, /shebang/i);
  });

  it('verify .sh com shebang nao-bash: erro (CA-1), sem chamar o bash', async () => {
    const fake = new FakeBash();
    const errors = await validatorFor('invalid-verify-bad-shebang', fake).validate(
      step('verify-step-01.sh'),
      P
    );
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'error');
    assert.match(errors[0].message, /interpretador/i);
    assert.strictEqual(fake.calls, 0);
  });

  it('verify .sh com erro de sintaxe (bash -n falha): erro (CA-1)', async () => {
    const fake = new FakeBash({
      disponivel: true,
      ok: false,
      mensagem: 'line 3: syntax error'
    });
    const errors = await validatorFor('valid-tutorial', fake).validate(step('verify-step-01.sh'), P);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'error');
    assert.match(errors[0].message, /sintaxe/i);
    assert.match(errors[0].message, /line 3/);
  });

  it('bash indisponivel: aviso, nao bloqueia (RNF06)', async () => {
    const errors = await validatorFor('valid-tutorial', new FakeBash({ disponivel: false, ok: false }))
      .validate(step('verify-step-01.sh'), P);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'warning');
    assert.match(errors[0].message, /indisponivel/i);
  });

  it('background com extensao errada: aviso (nao e script de avaliacao)', async () => {
    const block: TextBlock = { text: 'intro.md', background: 'intro.md' };
    const errors = await validatorFor('valid-tutorial', new FakeBash(OK)).validateBackground(
      block,
      '/details/intro/background'
    );
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'warning');
  });

  it('NodeBashSyntaxChecker: pega erro de sintaxe real', async function () {
    if (!bashAvailable()) {
      this.skip();
    }
    const errors = await validatorFor('invalid-verify-bad-syntax', new NodeBashSyntaxChecker())
      .validate(step('verify-step-01.sh'), P);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].severity, 'error');
    assert.match(errors[0].message, /sintaxe/i);
  });
});
