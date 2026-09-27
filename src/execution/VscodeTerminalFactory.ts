import * as vscode from 'vscode';
import { TerminalFactory, TerminalHandle } from './TerminalService';

const TERMINAL_NAME = 'Tutoriais Interativos';

class VscodeTerminalHandle implements TerminalHandle {
  constructor(private readonly terminal: vscode.Terminal) {}

  show(): void {
    this.terminal.show(true);
  }

  sendText(command: string): void {
    this.terminal.sendText(command, true);
  }

  get closed(): boolean {
    return this.terminal.exitStatus !== undefined;
  }
}

export class VscodeTerminalFactory implements TerminalFactory {
  create(): TerminalHandle {
    return new VscodeTerminalHandle(vscode.window.createTerminal({ name: TERMINAL_NAME }));
  }
}
