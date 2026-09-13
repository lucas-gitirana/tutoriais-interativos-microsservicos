import { execFileSync, spawnSync } from 'node:child_process';
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
  { name: 'reload', fixture: 'invalid-missing-markdown' },
  { name: 'eval-invalid', fixture: 'invalid-verify-not-sh' },
  { name: 'eval-warn', fixture: 'warn-verify-without-points' },
  { name: 'execution', fixture: 'valid-tutorial' }
];

/** `true` se `cmd` existe no PATH. */
function hasCommand(cmd: string): boolean {
  return spawnSync('which', [cmd], { stdio: 'ignore' }).status === 0;
}

/**
 * Em Linux sem servidor grafico, reexecuta este mesmo script sob `xvfb-run`
 * (headless). Assim `npm run test:integration` funciona localmente sem lembrar
 * do wrapper. Se `xvfb-run` nao existir, segue e deixa o erro real aparecer.
 */
function reexecUnderXvfbIfNeeded(): void {
  const needsDisplay = process.platform === 'linux' && !process.env.DISPLAY;
  if (!needsDisplay || process.env.TUTORIAIS_XVFB === '1') {
    return;
  }
  if (!hasCommand('xvfb-run')) {
    console.warn(
      '[test:integration] Sem DISPLAY e sem xvfb-run. O VS Code de teste precisa ' +
        'de um servidor grafico. Veja o README (secao "Rodando os testes de integracao").'
    );
    return;
  }
  console.log('[test:integration] Sem DISPLAY — reexecutando sob xvfb-run...');
  execFileSync(
    'xvfb-run',
    ['-a', process.execPath, __filename],
    { stdio: 'inherit', env: { ...process.env, TUTORIAIS_XVFB: '1' } }
  );
  process.exit(0);
}

async function main(): Promise<void> {
  reexecUnderXvfbIfNeeded();

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
      launchArgs: [workspace, '--disable-extensions', '--no-sandbox'],
      extensionTestsEnv: { TUTORIAIS_SCENARIO: scenario.name }
    });
  }
}

main().catch((err) => {
  console.error('\nFalha nos testes de integracao:', err?.message ?? err);
  if (String(err?.message ?? err).includes('code 127')) {
    console.error(
      '\nO binario do VS Code de teste nao encontrou bibliotecas de sistema.\n' +
        'No Ubuntu 24.04 instale (uma vez, com sudo):\n\n' +
        '  sudo apt-get update && sudo apt-get install -y \\\n' +
        '    xvfb libnss3 libnspr4 libasound2t64 libgbm1 libdrm2 libxkbcommon0 \\\n' +
        '    libgtk-3-0t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 \\\n' +
        '    libatspi2.0-0t64 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \\\n' +
        '    libxshmfence1 libpango-1.0-0 libcairo2 libx11-xcb1\n\n' +
        'Depois rode novamente: npm run test:integration\n'
    );
  }
  process.exit(1);
});
