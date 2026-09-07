import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { JsonSource, toSegments } from '../../loading/JsonSource';
import { FIXTURES } from './helpers';

describe('JsonSource', () => {
  it('mapeia /details/steps/0/points para o intervalo correto', () => {
    const text = fs.readFileSync(path.join(FIXTURES, 'positional/index.json'), 'utf8');
    const { source, parseErrors } = JsonSource.parse(text);

    assert.deepStrictEqual(parseErrors, []);

    const range = source.rangeForPath('/details/steps/0/points');
    assert.ok(range, 'deve encontrar o no');
    assert.strictEqual(range!.line, 9, 'linha 0-based do valor de points');

    const linha = text.split(/\r?\n/)[range!.line];
    assert.strictEqual(
      linha.slice(range!.character, range!.endCharacter),
      '"dez"',
      'o intervalo deve cobrir exatamente o valor'
    );
    assert.strictEqual(range!.endLine, 9);
  });

  it('reporta exatamente 1 erro posicionado em JSON malformado', () => {
    const text = fs.readFileSync(path.join(FIXTURES, 'malformed/index.json'), 'utf8');
    const { parseErrors } = JsonSource.parse(text);

    assert.strictEqual(parseErrors.length, 1);
    assert.strictEqual(parseErrors[0].severity, 'error');
    assert.match(parseErrors[0].message, /malformado/i);
    assert.ok(parseErrors[0].range, 'erro de parse deve ter posicao');
  });

  it('vírgula faltando entre propriedades -> mensagem fala em vírgula, nao em colchete', () => {
    const text = [
      '{',
      '  "title": "t",',
      '  "file": {',
      '    "name": "a.py"',
      '    "line": 12',
      '  }',
      '}'
    ].join('\n');
    const { parseErrors } = JsonSource.parse(text);

    assert.strictEqual(parseErrors.length, 1);
    assert.match(parseErrors[0].message, /v[ií]rgula/i);
    assert.doesNotMatch(parseErrors[0].message, /colchete/i);
    // Aponta para o token onde a vírgula deveria estar (linha de "line").
    assert.strictEqual(parseErrors[0].range?.line, 4);
  });

  it('trata o caminho raiz', () => {
    const { source } = JsonSource.parse('{\n  "a": 1\n}\n');
    const range = source.rangeForPath('/');
    assert.ok(range);
    assert.strictEqual(range!.line, 0);
    assert.strictEqual(range!.character, 0);
  });

  it('aponta para o container quando a propriedade nao existe', () => {
    const { source } = JsonSource.parse('{\n  "backend": {}\n}\n');
    const range = source.rangeForPath('/backend/imageid');
    assert.ok(range, 'deve cair para o container /backend');
    assert.strictEqual(range!.line, 1);
  });

  describe('toSegments', () => {
    it('converte JSON Pointer em segmentos', () => {
      assert.deepStrictEqual(toSegments('/details/steps/0/points'), [
        'details',
        'steps',
        0,
        'points'
      ]);
      assert.deepStrictEqual(toSegments(''), []);
      assert.deepStrictEqual(toSegments('/'), []);
      assert.deepStrictEqual(toSegments('/a~1b'), ['a/b']);
    });
  });
});
