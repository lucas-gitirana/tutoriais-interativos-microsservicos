export enum StepStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

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
