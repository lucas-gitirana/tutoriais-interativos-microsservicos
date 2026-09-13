/** Referencia a um terminal aberto, ja pronto para receber comandos. */
export interface TerminalHandle {
  /** Traz o terminal para o primeiro plano. */
  show(): void;
  /** Digita e executa `command` no terminal (equivalente a colar + Enter). */
  sendText(command: string): void;
  /** `true` quando o terminal foi fechado pelo usuario (precisa criar outro). */
  readonly closed: boolean;
}

/** Cria um novo {@link TerminalHandle}. Implementado sobre `vscode.window.createTerminal`. */
export interface TerminalFactory {
  create(): TerminalHandle;
}

/**
 * Executa comandos no terminal integrado (CA-7, RF09): blocos de codigo
 * bash/sh/shell clicados no conteudo da etapa e o `background` automatico de
 * `intro`/`finish`.
 *
 * Reaproveita um unico terminal entre chamadas enquanto ele continuar aberto;
 * cria outro se o usuario fechar o anterior. A criacao real do terminal e
 * injetada ({@link TerminalFactory}) para que essa logica de reaproveitamento
 * seja testavel sem o modulo `vscode`.
 *
 * Corresponde a classe `TerminalService` do Diagrama de Classes. Nesta
 * historia `runCommand` **nao** produz um `CommandResult` (o diagrama declara
 * `{ exitCode, output }`): capturar o resultado de um comando digitado no
 * terminal integrado exigiria a API de Shell Integration do VSCode, que nao e
 * necessaria para o criterio de aceitacao (CA-7 so pede que o comando seja
 * executado, nao que o resultado seja inspecionado — isso e avaliacao, UC04).
 * Divergencia a registrar em `.claude/diagrams/diagramas.md` apos confirmacao
 * do autor.
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
