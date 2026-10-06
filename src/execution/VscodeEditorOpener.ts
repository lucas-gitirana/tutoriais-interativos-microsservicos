import * as vscode from 'vscode';
import { resolveRelative } from '../fs/workspace';
import { EditorOpener } from './FileNavigationService';

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

  async close(relativePath: string): Promise<void> {
    const uri = resolveRelative(this.tutorialDir, relativePath).toString();
    const document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri);
    if (document?.isDirty) {
      await document.save();
    }
    const tabs = vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .filter((tab) => tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === uri);
    if (tabs.length > 0) {
      await vscode.window.tabGroups.close(tabs, true);
    }
  }
}
