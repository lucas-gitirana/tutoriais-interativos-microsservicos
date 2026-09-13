import { Screen, SimpleEmitter, StepStatus } from './types';

/** Estado publico notificado a cada mudanca de tela/status. */
export interface ExecutionState {
  screen: Screen;
  statuses: ReadonlyMap<number, StepStatus>;
}

/**
 * Orquestra a navegacao de um tutorial em execucao (UC03): qual tela esta
 * ativa (introducao / etapa N / finalizacao) e o status de conclusao de cada
 * etapa.
 *
 * Nao conhece VSCode nem faz renderizacao — so mantem a maquina de estados e
 * notifica `onDidChange`; quem escuta (via `extension.ts`, usando
 * `StepExecutor` e `TutorialWebviewPanel`) decide o que fazer (abrir arquivo,
 * renderizar markdown etc.). Essa separacao mantem o controller testavel sem
 * o modulo `vscode`.
 *
 * Corresponde a classe `TutorialController` do Diagrama de Classes
 * (`.claude/diagrams/diagramas.md`). Acrescenta `goToStep(index)`, nao
 * previsto no diagrama, para cobrir a CA-3 da US03 (clicar em qualquer etapa
 * da lista abre a etapa selecionada, nao so a sequencial seguinte) —
 * divergencia a registrar em `diagramas.md` apos confirmacao do autor.
 * `stop()` nao e implementado nesta historia (interromper a execucao e a
 * US04, fora do escopo da US03).
 */
export class TutorialController {
  private screen: Screen | undefined;
  private readonly statuses = new Map<number, StepStatus>();
  private readonly changeEmitter = new SimpleEmitter<ExecutionState>();

  readonly onDidChange = this.changeEmitter.event;

  constructor(private readonly totalSteps: number) {}

  /** Abre a tela de introducao (CA-2). Idempotente: nao reinicia o progresso ja feito. */
  start(): void {
    this.setScreen({ kind: 'intro' });
  }

  /**
   * Avanca a partir da tela atual (CA-4, CA-5): a etapa deixada para tras e
   * marcada `COMPLETED`. Sem efeito se a execucao ainda nao comecou
   * ({@link start} nao foi chamado) ou se ja esta na tela de finalizacao.
   */
  next(): void {
    if (!this.screen) {
      return;
    }
    if (this.screen.kind === 'intro') {
      this.setScreen(this.totalSteps > 0 ? { kind: 'step', index: 0 } : { kind: 'finish' });
      return;
    }
    if (this.screen.kind === 'step') {
      this.statuses.set(this.screen.index, StepStatus.COMPLETED);
      const nextIndex = this.screen.index + 1;
      this.setScreen(
        nextIndex < this.totalSteps ? { kind: 'step', index: nextIndex } : { kind: 'finish' }
      );
    }
  }

  /**
   * Volta uma tela, sem alterar nenhum status de conclusao. Sem efeito antes
   * de {@link start}, na propria introducao ou na tela de finalizacao (nenhum
   * criterio de aceitacao da US03 exige voltar a partir do fim).
   */
  previous(): void {
    if (!this.screen || this.screen.kind !== 'step') {
      return;
    }
    this.setScreen(
      this.screen.index === 0 ? { kind: 'intro' } : { kind: 'step', index: this.screen.index - 1 }
    );
  }

  /**
   * Abre a etapa `index` diretamente (CA-3), sem alterar status — clicar numa
   * etapa so a exibe, quem marca conclusao e {@link next}. Assim como
   * {@link start}, funciona mesmo antes de a execucao ter comecado (clicar
   * direto numa etapa na TreeView, sem ter clicado o play antes). Sem efeito
   * com um `index` fora do intervalo de etapas.
   */
  goToStep(index: number): void {
    if (index < 0 || index >= this.totalSteps) {
      return;
    }
    this.setScreen({ kind: 'step', index });
  }

  getScreen(): Screen | undefined {
    return this.screen;
  }

  statusOf(index: number): StepStatus {
    return this.statuses.get(index) ?? StepStatus.PENDING;
  }

  /** Contagem de etapas concluidas, para `treeView.description`/RF06. */
  getProgress(): { completed: number; total: number } {
    let completed = 0;
    for (const status of this.statuses.values()) {
      if (status === StepStatus.COMPLETED) {
        completed++;
      }
    }
    return { completed, total: this.totalSteps };
  }

  private setScreen(screen: Screen): void {
    this.screen = screen;
    this.changeEmitter.fire({ screen, statuses: new Map(this.statuses) });
  }
}
