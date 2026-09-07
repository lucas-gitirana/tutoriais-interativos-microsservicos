import * as path from 'node:path';
import { glob } from 'glob';
import Mocha from 'mocha';

/**
 * Ponto de entrada da suite de integracao carregada pelo `@vscode/test-electron`.
 *
 * O cenario ativo e escolhido pela variavel de ambiente `TUTORIAIS_SCENARIO`
 * (`happy` | `invalid` | `reload`); cada arquivo `*.test.js` decide se roda com
 * base nela. Quando nao definida, roda todos os arquivos.
 */
export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'bdd', color: true, timeout: 20000 });
  const testsRoot = __dirname;

  const files = await glob('**/*.test.js', { cwd: testsRoot });
  for (const file of files) {
    mocha.addFile(path.resolve(testsRoot, file));
  }

  await new Promise<void>((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} teste(s) de integracao falharam.`));
      } else {
        resolve();
      }
    });
  });
}
