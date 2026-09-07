import * as assert from 'node:assert';
import { depthOf, pickIndexJson, splitRelativeSegments } from '../../fs/pathUtils';

describe('pathUtils', () => {
  describe('splitRelativeSegments', () => {
    it('remove "./" e segmentos vazios', () => {
      assert.deepStrictEqual(splitRelativeSegments('./intro.md'), ['intro.md']);
      assert.deepStrictEqual(splitRelativeSegments('conteudo/step-01.md'), [
        'conteudo',
        'step-01.md'
      ]);
      assert.deepStrictEqual(splitRelativeSegments('./a//b/'), ['a', 'b']);
    });

    it('normaliza separadores de Windows e preserva ".."', () => {
      assert.deepStrictEqual(splitRelativeSegments('a\\b\\c.md'), ['a', 'b', 'c.md']);
      assert.deepStrictEqual(splitRelativeSegments('../compartilhado/x.md'), [
        '..',
        'compartilhado',
        'x.md'
      ]);
    });
  });

  describe('depthOf', () => {
    it('conta separadores', () => {
      assert.strictEqual(depthOf('index.json'), 0);
      assert.strictEqual(depthOf('tut/index.json'), 1);
      assert.strictEqual(depthOf('a/b/index.json'), 2);
    });
  });

  describe('pickIndexJson', () => {
    it('escolhe o de menor profundidade e marca ambiguidade', () => {
      const r = pickIndexJson(['a/b/index.json', 'index.json', 'c/index.json']);
      assert.strictEqual(r.chosen, 'index.json');
      assert.strictEqual(r.ambiguous, true);
    });

    it('um unico candidato nao e ambiguo', () => {
      const r = pickIndexJson(['tut/index.json']);
      assert.strictEqual(r.chosen, 'tut/index.json');
      assert.strictEqual(r.ambiguous, false);
    });

    it('lista vazia', () => {
      assert.deepStrictEqual(pickIndexJson([]), { ambiguous: false });
    });

    it('empate de profundidade -> ordem lexicografica estavel', () => {
      const r = pickIndexJson(['b/index.json', 'a/index.json']);
      assert.strictEqual(r.chosen, 'a/index.json');
      assert.strictEqual(r.ambiguous, true);
    });
  });
});
