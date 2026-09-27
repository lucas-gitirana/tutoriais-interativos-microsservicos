import * as vscode from 'vscode';
import { pickIndexJson, splitRelativeSegments } from './pathUtils';

const INDEX_GLOB = '**/index.json';
const EXCLUDE_GLOB = '**/node_modules/**';

/**
 * Procura o `index.json` do workspace.
 *
 * Escolhe o de menor profundidade (mais proximo da raiz). Se houver mais de um
 * candidato, registra um aviso no console e retorna o primeiro.
 */
export async function findIndexJson(): Promise<vscode.Uri | undefined> {
  const matches = await vscode.workspace.findFiles(INDEX_GLOB, EXCLUDE_GLOB);
  if (matches.length === 0) {
    return undefined;
  }
  const byPath = new Map<string, vscode.Uri>();
  for (const uri of matches) {
    byPath.set(relativeToWorkspace(uri), uri);
  }
  const choice = pickIndexJson([...byPath.keys()]);
  if (choice.ambiguous) {
    console.warn(
      `[Tutoriais Interativos] ${matches.length} arquivos index.json encontrados; ` +
        `usando "${choice.chosen}". Apenas um tutorial por workspace e suportado nesta versao.`
    );
  }
  return choice.chosen ? byPath.get(choice.chosen) : matches[0];
}

function relativeToWorkspace(uri: vscode.Uri): string {
  const rel = vscode.workspace.asRelativePath(uri, false);
  return rel.replace(/\\/g, '/');
}

export function resolveRelative(tutorialDir: vscode.Uri, relativePath: string): vscode.Uri {
  return vscode.Uri.joinPath(tutorialDir, ...splitRelativeSegments(relativePath));
}

export function dirOf(indexUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(indexUri, '..');
}

export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
