import * as assert from 'node:assert';
import { TerminalFactory, TerminalHandle, TerminalService } from '../../execution/TerminalService';

class FakeTerminalHandle implements TerminalHandle {
  shown = 0;
  sent: string[] = [];
  closed = false;

  show(): void {
    this.shown++;
  }

  sendText(command: string): void {
    this.sent.push(command);
  }
}

class FakeTerminalFactory implements TerminalFactory {
  created: FakeTerminalHandle[] = [];

  create(): TerminalHandle {
    const handle = new FakeTerminalHandle();
    this.created.push(handle);
    return handle;
  }
}

describe('TerminalService', () => {
  it('primeira chamada cria o terminal e envia o comando', () => {
    const factory = new FakeTerminalFactory();
    const service = new TerminalService(factory);
    service.runCommand('docker ps');
    assert.strictEqual(factory.created.length, 1);
    assert.deepStrictEqual(factory.created[0].sent, ['docker ps']);
    assert.strictEqual(factory.created[0].shown, 1);
  });

  it('chamadas seguintes reaproveitam o mesmo terminal', () => {
    const factory = new FakeTerminalFactory();
    const service = new TerminalService(factory);
    service.runCommand('echo 1');
    service.runCommand('echo 2');
    assert.strictEqual(factory.created.length, 1);
    assert.deepStrictEqual(factory.created[0].sent, ['echo 1', 'echo 2']);
  });

  it('cria um novo terminal se o anterior tiver sido fechado', () => {
    const factory = new FakeTerminalFactory();
    const service = new TerminalService(factory);
    service.runCommand('echo 1');
    factory.created[0].closed = true;
    service.runCommand('echo 2');
    assert.strictEqual(factory.created.length, 2);
    assert.deepStrictEqual(factory.created[1].sent, ['echo 2']);
  });
});
