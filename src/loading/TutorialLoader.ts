import * as vscode from 'vscode';
import { NodeBashSyntaxChecker } from '../fs/BashSyntaxChecker';
import { VscodeScriptReader } from '../fs/VscodeScriptReader';
import { TutorialDefinition } from '../model/tutorial';
import { dirOf, findIndexJson } from '../fs/workspace';
import { VscodeFileProbe } from '../fs/VscodeFileProbe';
import { runEvaluationChecks } from './EvaluationChecks';
import { JsonSource } from './JsonSource';
import { ReferenceValidator } from './ReferenceValidator';
import { TutorialSchemaValidator } from './TutorialSchemaValidator';
import { VerifyScriptValidator } from './VerifyScriptValidator';
import { LoadResult, ValidationError } from './types';

export type ReferenceValidatorFactory = (tutorialDir: vscode.Uri) => ReferenceValidator;

export type VerifyScriptValidatorFactory = (tutorialDir: vscode.Uri) => VerifyScriptValidator;

const defaultReferenceValidatorFactory: ReferenceValidatorFactory = (dir) =>
  new ReferenceValidator(new VscodeFileProbe(dir));

const defaultVerifyScriptValidatorFactory: VerifyScriptValidatorFactory = (dir) =>
  new VerifyScriptValidator(new VscodeScriptReader(dir), new NodeBashSyntaxChecker());

/**
 * Orquestra a carga de um tutorial a partir do workspace aberto:
 *
 * 1. localiza o `index.json` (senao: `status: 'none'`);
 * 2. le os bytes e faz o parse posicional;
 * 3. valida contra o JSON Schema;
 * 4. se valido, valida a existencia das referencias;
 * 5. se as referencias existem, valida os scripts de avaliacao — `.sh`, shebang,
 *    sintaxe — e a coerencia de `points`;
 * 6. consolida o {@link LoadResult} (erros bloqueiam; avisos acompanham o `ok`).
 */
export class TutorialLoader {
  constructor(
    private readonly schemaValidator: TutorialSchemaValidator,
    private readonly referenceValidatorFactory: ReferenceValidatorFactory = defaultReferenceValidatorFactory,
    private readonly verifyScriptValidatorFactory: VerifyScriptValidatorFactory = defaultVerifyScriptValidatorFactory
  ) {}

  async loadFromWorkspace(): Promise<LoadResult> {
    const indexUri = await findIndexJson();
    if (!indexUri) {
      return { status: 'none' };
    }

    let text: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(indexUri);
      text = Buffer.from(bytes).toString('utf8');
    } catch (err) {
      return {
        status: 'invalid',
        indexUri,
        errors: [
          {
            path: '/',
            severity: 'error',
            message: `Nao foi possivel ler o index.json: ${String(err)}.`
          }
        ]
      };
    }

    const { source, parseErrors } = JsonSource.parse(text);
    if (parseErrors.length > 0) {
      return { status: 'invalid', indexUri, errors: parseErrors };
    }

    const schemaResult = this.schemaValidator.validate(source.getValue());
    const schemaErrors = withRanges(schemaResult.errors, source);
    if (!schemaResult.valid) {
      return { status: 'invalid', indexUri, errors: schemaErrors };
    }

    const tutorial = source.getValue() as TutorialDefinition;
    const tutorialDir = dirOf(indexUri);

    const referenceValidator = this.referenceValidatorFactory(tutorialDir);
    const referenceErrors = await referenceValidator.validate(tutorial, source);
    if (referenceErrors.some((e) => e.severity === 'error')) {
      return { status: 'invalid', indexUri, errors: referenceErrors };
    }

    const scriptValidator = this.verifyScriptValidatorFactory(tutorialDir);
    const evaluationErrors = await runEvaluationChecks(tutorial, scriptValidator, source);

    const problemas = [...referenceErrors, ...evaluationErrors];
    if (problemas.some((e) => e.severity === 'error')) {
      return { status: 'invalid', indexUri, errors: problemas };
    }

    return {
      status: 'ok',
      tutorial,
      tutorialDir: tutorialDir.fsPath,
      indexUri,
      warnings: problemas
    };
  }
}

function withRanges(errors: ValidationError[], source: JsonSource): ValidationError[] {
  return errors.map((e) => ({
    ...e,
    range: e.range ?? source.rangeForPath(e.path)
  }));
}
