export interface TerminalHandle {
  show(): void;
  sendText(command: string): void;
  readonly closed: boolean;
}

export interface TerminalFactory {
  create(): TerminalHandle;
}

/**
 * Executa comandos no terminal integrado
 */
export class TerminalService {
  private terminal: TerminalHandle | undefined;

  constructor(private readonly factory: TerminalFactory) {}

  runCommand(command: string): void {
    if (!this.terminal || this.terminal.closed) {
      this.terminal = this.factory.create();
    }
    this.terminal.show();
    this.terminal.sendText(command);
  }
}
