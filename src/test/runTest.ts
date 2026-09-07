import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

interface Scenario {
  name: string;
  fixture: string;
}

const SCENARIOS: Scenario[] = [
  { name: 'happy', fixture: 'valid-tutorial' },
  { name: 'invalid', fixture: 'invalid-missing-markdown' },
  { name: 'reload', fixture: 'invalid-missing-markdown' }
];

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  const fixturesRoot = path.resolve(__dirname, '../../src/test/fixtures');

  for (const scenario of SCENARIOS) {
    // Copia a fixture para um diretorio temporario para nao sujar o repositorio
    // (o cenario "reload" escreve arquivos no workspace).
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `tut-${scenario.name}-`));
    fs.cpSync(path.join(fixturesRoot, scenario.fixture), workspace, { recursive: true });

    console.log(`\n=== Cenario "${scenario.name}" (${scenario.fixture}) ===`);
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspace, '--disable-extensions'],
      extensionTestsEnv: { TUTORIAIS_SCENARIO: scenario.name }
    });
  }
}

main().catch((err) => {
  console.error('Falha nos testes de integracao:', err);
  process.exit(1);
});
