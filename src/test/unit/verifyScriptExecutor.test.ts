import * as assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { NodeVerifyScriptExecutor } from '../../evaluation/NodeVerifyScriptExecutor';
import { FIXTURES } from './helpers';

const SCRIPTS = path.join(FIXTURES, 'verify-scripts');

function bashAvailable(): boolean {
  return spawnSync('bash', ['-c', 'true'], { stdio: 'ignore' }).status === 0;
}

describe('NodeVerifyScriptExecutor', () => {
  it('script que sai 0 sem saida: exitCode 0, output vazio', async function () {
    if (!bashAvailable()) {
      this.skip();
    }
    const executor = new NodeVerifyScriptExecutor();
    const result = await executor.run(path.join(SCRIPTS, 'always-pass.sh'), SCRIPTS);
    assert.deepStrictEqual(result, { exitCode: 0, output: '', timedOut: false });
  });

  it('script que sai != 0 imprimindo em stdout: captura a mensagem exata', async function () {
    if (!bashAvailable()) {
      this.skip();
    }
    const executor = new NodeVerifyScriptExecutor();
    const result = await executor.run(path.join(SCRIPTS, 'always-fail.sh'), SCRIPTS);
    assert.strictEqual(result.exitCode, 1);
    assert.strictEqual(result.timedOut, false);
    assert.match(result.output, /Esperado: o arquivo 'resultado\.txt'/);
  });

  it('script que sai != 0 imprimindo so em stderr: captura tambem', async function () {
    if (!bashAvailable()) {
      this.skip();
    }
    const executor = new NodeVerifyScriptExecutor();
    const result = await executor.run(path.join(SCRIPTS, 'stderr-fail.sh'), SCRIPTS);
    assert.strictEqual(result.exitCode, 2);
    assert.match(result.output, /variavel de ambiente ausente/);
  });

  it('estoura o timeout: mata o processo e marca timedOut', async function () {
    if (!bashAvailable()) {
      this.skip();
    }
    const executor = new NodeVerifyScriptExecutor(100);
    const result = await executor.run(path.join(SCRIPTS, 'sleeps-forever.sh'), SCRIPTS);
    assert.strictEqual(result.exitCode, null);
    assert.strictEqual(result.timedOut, true);
  });

  it('binario inexistente (bash ausente): resolve sem lancar excecao', async () => {
    const executor = new NodeVerifyScriptExecutor(5000, 'este-binario-nao-existe-xyz');
    const result = await executor.run(path.join(SCRIPTS, 'always-pass.sh'), SCRIPTS);
    assert.strictEqual(result.exitCode, null);
    assert.strictEqual(result.timedOut, false);
  });
});
