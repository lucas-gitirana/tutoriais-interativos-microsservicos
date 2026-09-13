import * as vscode from 'vscode';
import { resolveRelative } from '../fs/workspace';
import { EditorOpener } from './FileNavigationService';

/** {@link EditorOpener} real, sobre `vscode.window.showTextDocument`. */
export class VscodeEditorOpener implements EditorOpener {
  constructor(private readonly tutorialDir: vscode.Uri) {}

  async openBeside(relativePath: string, line0Based?: number): Promise<void> {
    const uri = resolveRelative(this.tutorialDir, relativePath);
    const selection =
      line0Based !== undefined ? new vscode.Range(line0Based, 0, line0Based, 0) : undefined;
    await vscode.window.showTextDocument(uri, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true,
      selection
    });
  }
}
