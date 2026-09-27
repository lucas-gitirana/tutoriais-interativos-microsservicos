import { BashSyntaxChecker } from '../fs/BashSyntaxChecker';
import { ScriptReader } from '../fs/ScriptReader';
import { Step, TextBlock } from '../model/tutorial';
import { JsonSource } from './JsonSource';
import { error, ValidationError, warning } from './types';

const SH_EXTENSION = /\.sh$/i;
const BASH_SHEBANG = /^#!.*\b(?:bash|sh)\b/;

/**
 * Valida o **formato e a validade** do script de avaliacao (`verify`) de uma
 * etapa:
 *
 * - o caminho deve terminar em `.sh` (CA-1) — erro;
 * - a 1a linha deve ser um shebang bash/sh — ausencia e aviso; interpretador
 *   diferente de bash/sh e erro;
 * - `bash -n` (analise sintatica, **sem executar**) deve passar — erro se falhar;
 *   se `bash` nao estiver disponivel, apenas aviso.
 *
 * `background` (setup de `intro`/`finish`) nao e script de avaliacao: as mesmas
 * checagens sao aplicadas, porem sempre com severidade `warning`.
 */
export class VerifyScriptValidator {
  constructor(
    private readonly reader: ScriptReader,
    private readonly bash: BashSyntaxChecker
  ) {}

  async validate(step: Step, pointer: string, source?: JsonSource): Promise<ValidationError[]> {
    if (!step.verify) {
      return [];
    }
    return this.inspect(step.verify, pointer, 'error', source);
  }

  async validateBackground(
    block: TextBlock | undefined,
    pointer: string,
    source?: JsonSource
  ): Promise<ValidationError[]> {
    if (!block?.background) {
      return [];
    }
    return this.inspect(block.background, pointer, 'warning', source);
  }

  private async inspect(
    scriptPath: string,
    pointer: string,
    severidade: 'error' | 'warning',
    source?: JsonSource
  ): Promise<ValidationError[]> {
    const range = source?.rangeForPath(pointer);
    const relatar = (message: string): ValidationError =>
      severidade === 'error'
        ? error(pointer, message, range)
        : warning(pointer, message, range);

    if (!SH_EXTENSION.test(scriptPath)) {
      return [
        relatar(
          `O script de avaliacao deve ser um arquivo bash com extensao '.sh': '${scriptPath}'.`
        )
      ];
    }

    const conteudo = await this.reader.read(scriptPath);
    if (conteudo === undefined) {
      // Arquivo inexistente ja e reportado pelo ReferenceValidator — nao duplicar.
      return [];
    }

    const problemas: ValidationError[] = [];
    const primeiraLinha = conteudo.split('\n', 1)[0].trim();

    if (!primeiraLinha.startsWith('#!')) {
      problemas.push(
        warning(
          pointer,
          "O script de avaliacao nao tem shebang. Recomenda-se '#!/usr/bin/env bash' na primeira linha.",
          range
        )
      );
    } else if (!BASH_SHEBANG.test(primeiraLinha)) {
      problemas.push(
        relatar(`O interpretador do script de avaliacao nao e bash: '${primeiraLinha}'.`)
      );
      return problemas;
    }

    const sintaxe = await this.bash.check(conteudo);
    if (!sintaxe.disponivel) {
      problemas.push(
        warning(
          pointer,
          "Nao foi possivel checar a sintaxe do script ('bash' indisponivel). A verificacao completa ocorre no ambiente Linux/Codespaces.",
          range
        )
      );
    } else if (!sintaxe.ok) {
      problemas.push(
        relatar(
          `O script de avaliacao tem erro de sintaxe bash: ${
            sintaxe.mensagem ?? 'erro nao especificado'
          }.`
        )
      );
    }

    return problemas;
  }
}
