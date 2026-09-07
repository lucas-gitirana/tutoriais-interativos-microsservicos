import * as vscode from 'vscode';
import { ScriptReader } from './ScriptReader';
import { resolveRelative } from './workspace';

/**
 * {@link ScriptReader} sobre `vscode.workspace.fs`, funcionando tambem em
 * workspaces remotos / GitHub Codespaces.
 */
export class VscodeScriptReader implements ScriptReader {
  constructor(private readonly tutorialDir: vscode.Uri) {}

  async read(relativePath: string): Promise<string | undefined> {
    try {
      const bytes = await vscode.workspace.fs.readFile(
        resolveRelative(this.tutorialDir, relativePath)
      );
      return Buffer.from(bytes).toString('utf8');
    } catch {
      return undefined;
    }
  }
}
