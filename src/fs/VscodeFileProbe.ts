import * as vscode from 'vscode';
import { FileProbe } from './FileProbe';
import { fileExists, resolveRelative } from './workspace';

/**
 * Implementacao de {@link FileProbe} sobre `vscode.workspace.fs`, funcionando
 * tambem em workspaces remotos / GitHub Codespaces.
 */
export class VscodeFileProbe implements FileProbe {
  constructor(private readonly tutorialDir: vscode.Uri) {}

  exists(relativePath: string): Promise<boolean> {
    return fileExists(resolveRelative(this.tutorialDir, relativePath));
  }
}
