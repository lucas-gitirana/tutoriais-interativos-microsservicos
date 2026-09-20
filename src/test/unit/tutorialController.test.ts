import * as assert from 'node:assert';
import { VerificationResult } from '../../evaluation/types';
import { TutorialController } from '../../controller/TutorialController';
import { StepStatus } from '../../controller/types';

/** Etapas sem `verify` vinculado — comportamento herdado de US03 (avancar marca COMPLETED). */
function noVerify(totalSteps: number): boolean[] {
  return new Array(totalSteps).fill(false);
}

describe('TutorialController', () => {
  it('start() abre a tela de introducao', () => {
    const controller = new TutorialController(3, noVerify(3));
    controller.start();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });
  });

  it('next() a partir da introducao vai para a etapa 0 sem marcar nenhum status', () => {
    const controller = new TutorialController(3, noVerify(3));
    controller.start();
    controller.next();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 0 });
    assert.strictEqual(controller.statusOf(0), StepStatus.PENDING);
  });

  it('next() numa etapa marca-a COMPLETED e avanca para a proxima', () => {
    const controller = new TutorialController(3, noVerify(3));
    controller.start();
    controller.next(); // step 0
    controller.next(); // step 1
    assert.strictEqual(controller.statusOf(0), StepStatus.COMPLETED);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 1 });
    assert.strictEqual(controller.statusOf(1), StepStatus.PENDING);
  });

  it('next() na ultima etapa marca-a COMPLETED e abre a tela de finalizacao', () => {
    const controller = new TutorialController(2, noVerify(2));
    controller.start();
    controller.next(); // step 0
    controller.next(); // step 1
    controller.next(); // finish
    assert.strictEqual(controller.statusOf(1), StepStatus.COMPLETED);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'finish' });
  });

  it('next() na tela de finalizacao nao tem efeito', () => {
    const controller = new TutorialController(1, noVerify(1));
    controller.start();
    controller.next(); // step 0
    controller.next(); // finish
    controller.next(); // no-op
    assert.deepStrictEqual(controller.getScreen(), { kind: 'finish' });
  });

  it('goToStep(k) abre a etapa k direto, sem alterar nenhum status', () => {
    const controller = new TutorialController(3, noVerify(3));
    controller.start();
    controller.goToStep(2);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 2 });
    assert.strictEqual(controller.statusOf(0), StepStatus.PENDING);
    assert.strictEqual(controller.statusOf(2), StepStatus.PENDING);
    assert.strictEqual(controller.getProgress().completed, 0);
  });

  it('goToStep() com indice fora do intervalo nao tem efeito', () => {
    const controller = new TutorialController(2, noVerify(2));
    controller.start();
    controller.goToStep(5);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });
    controller.goToStep(-1);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });
  });

  it('previous() volta uma tela sem alterar status', () => {
    const controller = new TutorialController(3, noVerify(3));
    controller.start();
    controller.next(); // step 0
    controller.next(); // step 1
    controller.previous();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 0 });
    assert.strictEqual(controller.statusOf(0), StepStatus.COMPLETED);
  });

  it('previous() na etapa 0 volta para a introducao', () => {
    const controller = new TutorialController(3, noVerify(3));
    controller.start();
    controller.next(); // step 0
    controller.previous();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });
  });

  it('previous() na introducao ou na finalizacao nao tem efeito', () => {
    const controller = new TutorialController(1, noVerify(1));
    controller.start();
    controller.previous();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });

    controller.next(); // step 0
    controller.next(); // finish
    controller.previous();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'finish' });
  });

  it('next()/previous() antes de start() nao lancam excecao e nao tem efeito', () => {
    const controller = new TutorialController(3, noVerify(3));
    assert.doesNotThrow(() => controller.next());
    assert.doesNotThrow(() => controller.previous());
    assert.strictEqual(controller.getScreen(), undefined);
  });

  it('goToStep() funciona mesmo antes de start() (clique direto na TreeView)', () => {
    const controller = new TutorialController(3, noVerify(3));
    assert.doesNotThrow(() => controller.goToStep(1));
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 1 });
  });

  it('getProgress() reflete a contagem de etapas concluidas a cada avanco', () => {
    const controller = new TutorialController(2, noVerify(2));
    controller.start();
    assert.deepStrictEqual(controller.getProgress(), { completed: 0, total: 2 });
    controller.next(); // step 0
    controller.next(); // step 1 (marca 0)
    assert.deepStrictEqual(controller.getProgress(), { completed: 1, total: 2 });
    controller.next(); // finish (marca 1)
    assert.deepStrictEqual(controller.getProgress(), { completed: 2, total: 2 });
  });

  it('onDidChange notifica os ouvintes a cada mudanca de tela', () => {
    const controller = new TutorialController(1, noVerify(1));
    const screens: string[] = [];
    controller.onDidChange((state) => screens.push(JSON.stringify(state.screen)));
    controller.start();
    controller.next();
    assert.strictEqual(screens.length, 2);
  });

  describe('etapas com verify vinculado (US04)', () => {
    const SUCESSO: VerificationResult = { success: true, output: '' };
    const FALHA: VerificationResult = { success: false, output: '', expectedOutput: 'x' };

    it('next() numa etapa com hasVerify=true NAO marca COMPLETED automaticamente', () => {
      const controller = new TutorialController(3, [true, false, true]);
      controller.start();
      controller.next(); // intro -> step 0
      controller.next(); // step 0 (hasVerify) -> step 1, sem marcar
      assert.strictEqual(controller.statusOf(0), StepStatus.PENDING);
      assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 1 });
    });

    it('next() numa etapa sem verify continua marcando COMPLETED (regressao de US03)', () => {
      const controller = new TutorialController(3, [true, false, true]);
      controller.start();
      controller.next(); // intro -> step 0
      controller.next(); // step 0 (hasVerify) -> step 1, sem marcar
      controller.next(); // step 1 (sem verify) -> step 2, marca step 1 COMPLETED
      assert.strictEqual(controller.statusOf(1), StepStatus.COMPLETED);
    });

    it('recordVerificationResult(sucesso) marca COMPLETED e dispara onDidChange', () => {
      const controller = new TutorialController(3, [true, false, true]);
      const eventos: unknown[] = [];
      controller.start();
      controller.goToStep(0);
      controller.onDidChange((state) => eventos.push(state));

      controller.recordVerificationResult(0, SUCESSO);

      assert.strictEqual(controller.statusOf(0), StepStatus.COMPLETED);
      assert.strictEqual(eventos.length, 1);
    });

    it('recordVerificationResult(falha) marca FAILED', () => {
      const controller = new TutorialController(3, [true, false, true]);
      controller.start();
      controller.goToStep(0);

      controller.recordVerificationResult(0, FALHA);

      assert.strictEqual(controller.statusOf(0), StepStatus.FAILED);
    });

    it('reexecutar recordVerificationResult so mantem o ultimo status (CA-3)', () => {
      const controller = new TutorialController(3, [true, false, true]);
      controller.start();
      controller.goToStep(0);

      controller.recordVerificationResult(0, FALHA);
      assert.strictEqual(controller.statusOf(0), StepStatus.FAILED);

      controller.recordVerificationResult(0, SUCESSO);
      assert.strictEqual(controller.statusOf(0), StepStatus.COMPLETED);
    });

    it('recordVerificationResult nao altera a tela atual', () => {
      const controller = new TutorialController(3, [true, false, true]);
      controller.start();
      controller.goToStep(0);

      controller.recordVerificationResult(0, SUCESSO);

      assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 0 });
    });

    it('next() apos um recordVerificationResult bem-sucedido nao reverte o status da etapa anterior', () => {
      const controller = new TutorialController(3, [true, false, true]);
      controller.start();
      controller.goToStep(0);
      controller.recordVerificationResult(0, SUCESSO);

      controller.next(); // "deixa para tras" a etapa 0 (ja COMPLETED via verificacao)

      assert.strictEqual(controller.statusOf(0), StepStatus.COMPLETED);
    });

    it('etapa com verify nunca verificada fica PENDING mesmo apos avancar (US05, ignorar)', () => {
      const controller = new TutorialController(2, [true, false]);
      controller.start();
      controller.next(); // intro -> step 0
      controller.next(); // step 0 (hasVerify, ignorada) -> step 1, sem marcar
      controller.next(); // step 1 (sem verify) -> finish, marca step 1
      assert.strictEqual(controller.statusOf(0), StepStatus.PENDING);
      assert.deepStrictEqual(controller.getScreen(), { kind: 'finish' });
    });
  });
  describe('stop() (US06)', () => {
    it('zera a tela atual e os status de todas as etapas', () => {
      const controller = new TutorialController(3, [true, false, false]);
      controller.start();
      controller.goToStep(0);
      controller.recordVerificationResult(0, { success: false, output: '' });
      controller.next(); // step 1 (sem verify)
      controller.next(); // step 1 -> COMPLETED, vai para a etapa 2

      controller.stop();

      assert.strictEqual(controller.getScreen(), undefined);
      for (let i = 0; i < 3; i++) {
        assert.strictEqual(controller.statusOf(i), StepStatus.PENDING);
      }
      assert.deepStrictEqual(controller.getProgress(), { completed: 0, total: 3 });
    });

    it('dispara onDidChange com tela indefinida e mapa de status vazio', () => {
      const controller = new TutorialController(2, noVerify(2));
      controller.start();
      controller.next();
      controller.next();
      const eventos: Array<{ screen: unknown; size: number }> = [];
      controller.onDidChange((state) =>
        eventos.push({ screen: state.screen, size: state.statuses.size })
      );

      controller.stop();

      assert.deepStrictEqual(eventos, [{ screen: undefined, size: 0 }]);
    });

    it('nao lanca erro quando chamado antes de start()', () => {
      const controller = new TutorialController(2, noVerify(2));
      assert.doesNotThrow(() => controller.stop());
      assert.strictEqual(controller.getScreen(), undefined);
    });

    it('permite recomecar da introducao depois de interromper', () => {
      const controller = new TutorialController(2, noVerify(2));
      controller.start();
      controller.next();
      controller.next(); // step 0 COMPLETED
      controller.stop();

      controller.start();
      assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });
      assert.strictEqual(controller.statusOf(0), StepStatus.PENDING);
      controller.next();
      controller.next();
      assert.strictEqual(controller.statusOf(0), StepStatus.COMPLETED);
    });
  });
});
