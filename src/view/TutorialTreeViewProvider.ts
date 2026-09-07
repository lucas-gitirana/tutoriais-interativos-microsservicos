import * as vscode from 'vscode';
import { LoadResult } from '../loading/types';

export type TutorialNode =
  | { kind: 'root'; label: string }
  | { kind: 'step'; label: string; index: number }
  | { kind: 'invalid'; label: string; indexUri: vscode.Uri };

/**
 * TreeView (aba na Activity Bar) que lista o tutorial detectado:
 *
 * - `none`    -> sem itens (o *welcome content* aparece);
 * - `invalid` -> um item "Tutorial invalido" que abre o `index.json`;
 * - `ok`      -> no raiz com o titulo + um filho por etapa, na ordem do array.
 *
 * Sem icone de status por etapa — status de execucao e UC03.
 */
export class TutorialTreeViewProvider implements vscode.TreeDataProvider<TutorialNode> {
  private readonly changeEmitter = new vscode.EventEmitter<TutorialNode | undefined>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  private current: LoadResult = { status: 'none' };

  refresh(result: LoadResult): void {
    this.current = result;
    this.changeEmitter.fire(undefined);
  }

  getTreeItem(node: TutorialNode): vscode.TreeItem {
    switch (node.kind) {
      case 'root': {
        const item = new vscode.TreeItem(
          node.label,
          vscode.TreeItemCollapsibleState.Expanded
        );
        item.contextValue = 'tutorialRoot';
        item.iconPath = new vscode.ThemeIcon('book');
        item.tooltip = 'Tutorial detectado e valido';
        return item;
      }
      case 'step': {
        const item = new vscode.TreeItem(
          node.label,
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'tutorialStep';
        item.description = `Etapa ${node.index + 1}`;
        return item;
      }
      case 'invalid': {
        const item = new vscode.TreeItem(
          node.label,
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'tutorialInvalid';
        item.iconPath = new vscode.ThemeIcon('warning');
        item.command = {
          command: 'vscode.open',
          title: 'Abrir index.json',
          arguments: [node.indexUri]
        };
        return item;
      }
    }
  }

  getChildren(element?: TutorialNode): TutorialNode[] {
    if (!element) {
      return this.rootNodes();
    }
    if (element.kind === 'root' && this.current.status === 'ok') {
      return this.current.tutorial.details.steps.map((step, index) => ({
        kind: 'step' as const,
        label: step.title,
        index
      }));
    }
    return [];
  }

  private rootNodes(): TutorialNode[] {
    switch (this.current.status) {
      case 'none':
        return [];
      case 'invalid':
        return [
          {
            kind: 'invalid',
            label: 'Tutorial invalido — corrija o index.json',
            indexUri: this.current.indexUri
          }
        ];
      case 'ok':
        return [{ kind: 'root', label: this.current.tutorial.title }];
    }
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
