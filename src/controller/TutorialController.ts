import { VerificationResult } from '../evaluation/types';
import { Screen, SimpleEmitter, StepStatus } from './types';

export interface ExecutionState {
  screen: Screen | undefined;
  statuses: ReadonlyMap<number, StepStatus>;
}

/**
 * Orquestra a navegacao de um tutorial em execucao
 *
 * Notifica `onDidChange` e quem escuta (via `extension.ts`, usando
 * `StepExecutor` e `TutorialWebviewPanel`) decide o que fazer. 
 * Essa separacao mantem o controller testavel sem o modulo `vscode`.
 */
export class TutorialController {
  private screen: Screen | undefined;
  private readonly statuses = new Map<number, StepStatus>();
  private readonly changeEmitter = new SimpleEmitter<ExecutionState>();

  readonly onDidChange = this.changeEmitter.event;

  constructor(
    private readonly totalSteps: number,
    private readonly hasVerify: readonly boolean[]
  ) {}
  
  start(): void {
    this.setScreen({ kind: 'intro' });
  }
  
  stop(): void {
    this.screen = undefined;
    this.statuses.clear();
    this.changeEmitter.fire({ screen: undefined, statuses: new Map() });
  }
  
  next(): void {
    if (!this.screen) {
      return;
    }
    if (this.screen.kind === 'intro') {
      this.setScreen(this.totalSteps > 0 ? { kind: 'step', index: 0 } : { kind: 'finish' });
      return;
    }
    if (this.screen.kind === 'step') {
      if (!this.hasVerify[this.screen.index]) {
        this.statuses.set(this.screen.index, StepStatus.COMPLETED);
      }
      const nextIndex = this.screen.index + 1;
      this.setScreen(
        nextIndex < this.totalSteps ? { kind: 'step', index: nextIndex } : { kind: 'finish' }
      );
    }
  }
  
  previous(): void {
    if (!this.screen || this.screen.kind !== 'step') {
      return;
    }
    this.setScreen(
      this.screen.index === 0 ? { kind: 'intro' } : { kind: 'step', index: this.screen.index - 1 }
    );
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.totalSteps) {
      return;
    }
    this.setScreen({ kind: 'step', index });
  }

  recordVerificationResult(index: number, result: VerificationResult): void {
    this.statuses.set(index, result.success ? StepStatus.COMPLETED : StepStatus.FAILED);
    if (this.screen) {
      this.changeEmitter.fire({ screen: this.screen, statuses: new Map(this.statuses) });
    }
  }

  getScreen(): Screen | undefined {
    return this.screen;
  }

  statusOf(index: number): StepStatus {
    return this.statuses.get(index) ?? StepStatus.PENDING;
  }

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
