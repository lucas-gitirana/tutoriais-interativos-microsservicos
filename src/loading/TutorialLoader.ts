import * as vscode from 'vscode';
import { TutorialDefinition } from '../model/tutorial';
import { dirOf, findIndexJson } from '../fs/workspace';
import { VscodeFileProbe } from '../fs/VscodeFileProbe';
import { JsonSource } from './JsonSource';
import { ReferenceValidator } from './ReferenceValidator';
import { TutorialSchemaValidator } from './TutorialSchemaValidator';
import { LoadResult, ValidationError } from './types';

/** Fabrica um {@link ReferenceValidator} para um diretorio de tutorial. */
export type ReferenceValidatorFactory = (tutorialDir: vscode.Uri) => ReferenceValidator;

const defaultReferenceValidatorFactory: ReferenceValidatorFactory = (dir) =>
  new ReferenceValidator(new VscodeFileProbe(dir));

/**
 * Orquestra a carga de um tutorial a partir do workspace aberto:
 *
 * 1. localiza o `index.json` (senao: `status: 'none'`);
 * 2. le os bytes e faz o parse posicional;
 * 3. valida contra o JSON Schema (CA-2);
 * 4. se valido, valida a existencia das referencias (CA-3);
 * 5. consolida o {@link LoadResult}.
 */
export class TutorialLoader {
  constructor(
    private readonly schemaValidator: TutorialSchemaValidator,
    private readonly referenceValidatorFactory: ReferenceValidatorFactory = defaultReferenceValidatorFactory
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

    const blocking = referenceErrors.filter((e) => e.severity === 'error');
    if (blocking.length > 0) {
      return { status: 'invalid', indexUri, errors: referenceErrors };
    }

    return {
      status: 'ok',
      tutorial,
      tutorialDir: tutorialDir.fsPath,
      indexUri,
      warnings: referenceErrors
    };
  }
}

function withRanges(errors: ValidationError[], source: JsonSource): ValidationError[] {
  return errors.map((e) => ({
    ...e,
    range: e.range ?? source.rangeForPath(e.path)
  }));
}
