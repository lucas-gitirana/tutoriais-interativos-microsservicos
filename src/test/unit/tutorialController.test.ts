import * as assert from 'node:assert';
import { TutorialController } from '../../controller/TutorialController';
import { StepStatus } from '../../controller/types';

describe('TutorialController', () => {
  it('start() abre a tela de introducao', () => {
    const controller = new TutorialController(3);
    controller.start();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });
  });

  it('next() a partir da introducao vai para a etapa 0 sem marcar nenhum status', () => {
    const controller = new TutorialController(3);
    controller.start();
    controller.next();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 0 });
    assert.strictEqual(controller.statusOf(0), StepStatus.PENDING);
  });

  it('next() numa etapa marca-a COMPLETED e avanca para a proxima', () => {
    const controller = new TutorialController(3);
    controller.start();
    controller.next(); // step 0
    controller.next(); // step 1
    assert.strictEqual(controller.statusOf(0), StepStatus.COMPLETED);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 1 });
    assert.strictEqual(controller.statusOf(1), StepStatus.PENDING);
  });

  it('next() na ultima etapa marca-a COMPLETED e abre a tela de finalizacao', () => {
    const controller = new TutorialController(2);
    controller.start();
    controller.next(); // step 0
    controller.next(); // step 1
    controller.next(); // finish
    assert.strictEqual(controller.statusOf(1), StepStatus.COMPLETED);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'finish' });
  });

  it('next() na tela de finalizacao nao tem efeito', () => {
    const controller = new TutorialController(1);
    controller.start();
    controller.next(); // step 0
    controller.next(); // finish
    controller.next(); // no-op
    assert.deepStrictEqual(controller.getScreen(), { kind: 'finish' });
  });

  it('goToStep(k) abre a etapa k direto, sem alterar nenhum status', () => {
    const controller = new TutorialController(3);
    controller.start();
    controller.goToStep(2);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 2 });
    assert.strictEqual(controller.statusOf(0), StepStatus.PENDING);
    assert.strictEqual(controller.statusOf(2), StepStatus.PENDING);
    assert.strictEqual(controller.getProgress().completed, 0);
  });

  it('goToStep() com indice fora do intervalo nao tem efeito', () => {
    const controller = new TutorialController(2);
    controller.start();
    controller.goToStep(5);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });
    controller.goToStep(-1);
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });
  });

  it('previous() volta uma tela sem alterar status', () => {
    const controller = new TutorialController(3);
    controller.start();
    controller.next(); // step 0
    controller.next(); // step 1
    controller.previous();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 0 });
    assert.strictEqual(controller.statusOf(0), StepStatus.COMPLETED);
  });

  it('previous() na etapa 0 volta para a introducao', () => {
    const controller = new TutorialController(3);
    controller.start();
    controller.next(); // step 0
    controller.previous();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });
  });

  it('previous() na introducao ou na finalizacao nao tem efeito', () => {
    const controller = new TutorialController(1);
    controller.start();
    controller.previous();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'intro' });

    controller.next(); // step 0
    controller.next(); // finish
    controller.previous();
    assert.deepStrictEqual(controller.getScreen(), { kind: 'finish' });
  });

  it('next()/previous() antes de start() nao lancam excecao e nao tem efeito', () => {
    const controller = new TutorialController(3);
    assert.doesNotThrow(() => controller.next());
    assert.doesNotThrow(() => controller.previous());
    assert.strictEqual(controller.getScreen(), undefined);
  });

  it('goToStep() funciona mesmo antes de start() (clique direto na TreeView)', () => {
    const controller = new TutorialController(3);
    assert.doesNotThrow(() => controller.goToStep(1));
    assert.deepStrictEqual(controller.getScreen(), { kind: 'step', index: 1 });
  });

  it('getProgress() reflete a contagem de etapas concluidas a cada avanco', () => {
    const controller = new TutorialController(2);
    controller.start();
    assert.deepStrictEqual(controller.getProgress(), { completed: 0, total: 2 });
    controller.next(); // step 0
    controller.next(); // step 1 (marca 0)
    assert.deepStrictEqual(controller.getProgress(), { completed: 1, total: 2 });
    controller.next(); // finish (marca 1)
    assert.deepStrictEqual(controller.getProgress(), { completed: 2, total: 2 });
  });

  it('onDidChange notifica os ouvintes a cada mudanca de tela', () => {
    const controller = new TutorialController(1);
    const screens: string[] = [];
    controller.onDidChange((state) => screens.push(JSON.stringify(state.screen)));
    controller.start();
    controller.next();
    assert.strictEqual(screens.length, 2);
  });
});
