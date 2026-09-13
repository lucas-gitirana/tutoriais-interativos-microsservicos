/**
 * Estado de execucao de uma etapa do tutorial. Reaproveita o enum `StepStatus`
 * do Diagrama de Classes (`.claude/diagrams/diagramas.md`); esta historia
 * (US03) so transita `PENDING -> COMPLETED` (o usuario avancou pela etapa).
 * `FAILED` fica reservado para quando a avaliacao automatica real do `verify`
 * rodar (UC04, RF11-RF13).
 */
export enum StepStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/** Tela atualmente exibida no `TutorialWebviewPanel`. */
export type Screen = { kind: 'intro' } | { kind: 'step'; index: number } | { kind: 'finish' };

type Listener<T> = (value: T) => void;

/**
 * Emissor de eventos minimo, sem depender do modulo `vscode` — permite que
 * classes como `TutorialController` sejam testadas fora do Extension Host
 * (`npm test`, mocha puro).
 */
export class SimpleEmitter<T> {
  private readonly listeners: Listener<T>[] = [];

  readonly event = (listener: Listener<T>): { dispose(): void } => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const i = this.listeners.indexOf(listener);
        if (i >= 0) {
          this.listeners.splice(i, 1);
        }
      }
    };
  };

  fire(value: T): void {
    for (const listener of [...this.listeners]) {
      listener(value);
    }
  }
}
