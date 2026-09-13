import * as vscode from 'vscode';
import { StepStatus } from '../controller/types';
import { LoadResult } from '../loading/types';

export type TutorialNode =
  | { kind: 'root'; label: string }
  | {
      kind: 'step';
      label: string;
      index: number;
      hasVerify: boolean;
      points?: number;
      status: StepStatus;
    }
  | { kind: 'invalid'; label: string; indexUri: vscode.Uri };

/**
 * TreeView (aba na Activity Bar) que lista o tutorial detectado:
 *
 * - `none`    -> sem itens (o *welcome content* aparece);
 * - `invalid` -> um item "Tutorial invalido" que abre o `index.json`;
 * - `ok`      -> no raiz com o titulo + um filho por etapa, na ordem do array.
 *
 * Cada etapa indica se tem avaliacao automatica vinculada (`verify`) e sua
 * pontuacao (`points`) na `description` (US02), e o **icone** reflete o
 * **status de execucao/verificacao** da etapa (pendente/concluida/incorreta —
 * US03 CA-4 e US04 CA-2) — clicar
 * numa etapa abre a etapa selecionada (CA-3, `tutoriais.abrirEtapa`).
 */
export class TutorialTreeViewProvider implements vscode.TreeDataProvider<TutorialNode> {
  private readonly changeEmitter = new vscode.EventEmitter<TutorialNode | undefined>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  private current: LoadResult = { status: 'none' };
  private statuses: ReadonlyMap<number, StepStatus> = new Map();

  refresh(result: LoadResult): void {
    this.current = result;
    this.statuses = new Map();
    this.changeEmitter.fire(undefined);
  }

  /** Atualiza o status de execucao das etapas (CA-4), sem recarregar o tutorial. */
  updateStatuses(statuses: ReadonlyMap<number, StepStatus>): void {
    this.statuses = statuses;
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
        const partes = [`Etapa ${node.index + 1}`];
        if (node.hasVerify) {
          partes.push('avaliação automática');
        }
        if (node.points !== undefined) {
          partes.push(`${node.points} pts`);
        }
        item.description = partes.join(' • ');
        item.iconPath = new vscode.ThemeIcon(iconForStatus(node.status));
        item.tooltip = `Etapa ${node.index + 1} — ${tooltipForStatus(node.status)}`;
        item.command = {
          command: 'tutoriais.abrirEtapa',
          title: 'Abrir etapa',
          arguments: [node.index]
        };
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
        index,
        hasVerify: typeof step.verify === 'string' && step.verify.length > 0,
        points: typeof step.points === 'number' ? step.points : undefined,
        status: this.statuses.get(index) ?? StepStatus.PENDING
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

/** Icone conforme o status de execucao/verificacao da etapa (US03 CA-4, US04 CA-2). */
function iconForStatus(status: StepStatus): string {
  switch (status) {
    case StepStatus.COMPLETED:
      return 'check';
    case StepStatus.FAILED:
      return 'error';
    default:
      return 'circle-outline';
  }
}

function tooltipForStatus(status: StepStatus): string {
  switch (status) {
    case StepStatus.COMPLETED:
      return 'concluída';
    case StepStatus.FAILED:
      return 'incorreta';
    default:
      return 'pendente';
  }
}
