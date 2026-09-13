import * as assert from 'node:assert';
import { EvaluationRunner } from '../../evaluation/EvaluationRunner';
import { VerifyRunResult, VerifyScriptExecutor } from '../../evaluation/VerifyScriptExecutor';
import { TerminalFactory, TerminalHandle, TerminalService } from '../../execution/TerminalService';
import { Step } from '../../model/tutorial';

class FakeExecutor implements VerifyScriptExecutor {
  calls: Array<{ absoluteScriptPath: string; cwd: string }> = [];
  constructor(private readonly result: VerifyRunResult) {}

  run(absoluteScriptPath: string, cwd: string): Promise<VerifyRunResult> {
    this.calls.push({ absoluteScriptPath, cwd });
    return Promise.resolve(this.result);
  }
}

class FakeTerminalHandle implements TerminalHandle {
  sent: string[] = [];
  closed = false;
  show(): void {}
  sendText(command: string): void {
    this.sent.push(command);
  }
}

class FakeTerminalFactory implements TerminalFactory {
  handle = new FakeTerminalHandle();
  create(): TerminalHandle {
    return this.handle;
  }
}

function step(verify: string): Step {
  return { title: 'Etapa 1', text: 'step-01.md', verify };
}

describe('EvaluationRunner', () => {
  it('resolve o caminho do script relativo ao tutorialDir', async () => {
    const executor = new FakeExecutor({ exitCode: 0, output: '', timedOut: false });
    const factory = new FakeTerminalFactory();
    const runner = new EvaluationRunner({ executor, terminal: new TerminalService(factory) });

    await runner.verify(step('scripts/verify-step-01.sh'), '/tutoriais/cqrs');

    assert.strictEqual(executor.calls.length, 1);
    assert.strictEqual(executor.calls[0].absoluteScriptPath, '/tutoriais/cqrs/scripts/verify-step-01.sh');
    assert.strictEqual(executor.calls[0].cwd, '/tutoriais/cqrs');
  });

  it('envia o heartbeat fixo ao terminal, sem conteudo dinamico', async () => {
    const executor = new FakeExecutor({ exitCode: 0, output: '', timedOut: false });
    const factory = new FakeTerminalFactory();
    const runner = new EvaluationRunner({ executor, terminal: new TerminalService(factory) });

    await runner.verify(step('verify.sh'), '/tutoriais/cqrs');

    assert.deepStrictEqual(factory.handle.sent, ['echo "› Executando verificação da etapa..."']);
  });

  it('exitCode 0: success true, sem expectedOutput', async () => {
    const executor = new FakeExecutor({ exitCode: 0, output: 'tudo certo', timedOut: false });
    const runner = new EvaluationRunner({
      executor,
      terminal: new TerminalService(new FakeTerminalFactory())
    });

    const result = await runner.verify(step('verify.sh'), '/tutoriais/cqrs');

    assert.deepStrictEqual(result, { success: true, output: 'tudo certo' });
  });

  it('exitCode != 0 com saida: success false, expectedOutput = output', async () => {
    const executor = new FakeExecutor({
      exitCode: 1,
      output: 'Esperado: crie o arquivo x.py',
      timedOut: false
    });
    const runner = new EvaluationRunner({
      executor,
      terminal: new TerminalService(new FakeTerminalFactory())
    });

    const result = await runner.verify(step('verify.sh'), '/tutoriais/cqrs');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.expectedOutput, 'Esperado: crie o arquivo x.py');
  });

  it('exitCode != 0 sem saida: mensagem de fallback', async () => {
    const executor = new FakeExecutor({ exitCode: 1, output: '', timedOut: false });
    const runner = new EvaluationRunner({
      executor,
      terminal: new TerminalService(new FakeTerminalFactory())
    });

    const result = await runner.verify(step('verify.sh'), '/tutoriais/cqrs');

    assert.strictEqual(result.success, false);
    assert.match(result.expectedOutput ?? '', /não produziu nenhuma saída/);
  });

  it('timedOut: mensagem especifica de timeout', async () => {
    const executor = new FakeExecutor({ exitCode: null, output: 'saida parcial', timedOut: true });
    const runner = new EvaluationRunner({
      executor,
      terminal: new TerminalService(new FakeTerminalFactory())
    });

    const result = await runner.verify(step('verify.sh'), '/tutoriais/cqrs');

    assert.strictEqual(result.success, false);
    assert.match(result.expectedOutput ?? '', /demorou demais/);
  });
});
