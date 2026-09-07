import * as assert from 'node:assert';
import * as vscode from 'vscode';
import type { TutorialExtensionApi } from '../../extension';

export const EXTENSION_ID = 'lucas-gitirana.tutoriais-interativos-microsservicos';

/** Cenario ativo, definido pelo `runTest.ts`. */
export function scenario(): string {
  return process.env.TUTORIAIS_SCENARIO ?? 'all';
}

/** Executa `body` apenas quando o cenario ativo casa com `name`. */
export function describeScenario(name: string, title: string, body: () => void): void {
  const active = scenario();
  const fn = active === name || active === 'all' ? describe : describe.skip;
  fn(`[${name}] ${title}`, body);
}

/** Ativa a extensao e devolve sua API de testes. */
export async function activateExtension(): Promise<TutorialExtensionApi> {
  const ext = vscode.extensions.getExtension<TutorialExtensionApi>(EXTENSION_ID);
  assert.ok(ext, `extensao ${EXTENSION_ID} nao encontrada`);
  const api = await ext!.activate();
  assert.ok(api, 'activate() deve retornar a API de testes');
  return api;
}

/** `Uri` do `index.json` da primeira pasta do workspace. */
export function indexUri(): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'nenhuma pasta de workspace aberta');
  return vscode.Uri.joinPath(folder!.uri, 'index.json');
}

/** Substitui `window.showWarningMessage` por um espiao; devolve o restaurador. */
export function stubShowWarningMessage(): {
  calls: string[];
  restore: () => void;
} {
  const calls: string[] = [];
  const original = vscode.window.showWarningMessage;
  (vscode.window as unknown as Record<string, unknown>).showWarningMessage = (
    message: string
  ) => {
    calls.push(message);
    return Promise.resolve(undefined);
  };
  return {
    calls,
    restore: () => {
      (vscode.window as unknown as Record<string, unknown>).showWarningMessage = original;
    }
  };
}

/** Aguarda ate `predicate()` ser verdadeiro ou estourar o tempo. */
export async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (await predicate()) {
      return;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor: condicao nao satisfeita dentro do tempo limite');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
