import { TutorialDefinition } from '../model/tutorial';
import { JsonSource } from './JsonSource';
import { error, ValidationError, warning } from './types';
import { VerifyScriptValidator } from './VerifyScriptValidator';

/**
 * Avisos de coerencia entre a avaliacao automatica (`verify`) e a pontuacao
 * (`points`) de cada etapa (RF14). Nao bloqueiam a disponibilizacao do tutorial.
 */
export function checkPointsCoherence(
  tutorial: TutorialDefinition,
  source?: JsonSource
): ValidationError[] {
  const problemas: ValidationError[] = [];
  tutorial.details.steps.forEach((step, i) => {
    const temVerify = typeof step.verify === 'string' && step.verify.length > 0;
    const temPoints = typeof step.points === 'number';
    if (temVerify && !temPoints) {
      const pointer = `/details/steps/${i}`;
      problemas.push(
        warning(
          pointer,
          "A etapa tem avaliacao automatica mas nenhuma pontuacao (RF14). Adicione 'points'.",
          source?.rangeForPath(pointer)
        )
      );
    } else if (temPoints && !temVerify) {
      const pointer = `/details/steps/${i}/points`;
      problemas.push(
        warning(
          pointer,
          'A etapa tem pontuacao mas nenhum script de avaliacao vinculado.',
          source?.rangeForPath(pointer)
        )
      );
    }
  });
  return problemas;
}

/**
 * Reforco do criterio "cada etapa pode estar vinculada a apenas um script de
 * avaliacao" (UC02 CA-2): erro quando uma etapa declara `verify` mais de uma vez.
 * O caso de `verify` como lista/objeto ja e barrado pelo JSON Schema.
 */
export function checkSingleVerifyKey(source?: JsonSource): ValidationError[] {
  if (!source) {
    return [];
  }
  return source.duplicateStepPropertyPointers('verify').map((pointer) =>
    error(
      pointer,
      'A etapa esta vinculada a mais de um script de avaliacao; cada etapa admite apenas um.',
      source.rangeForPath(pointer)
    )
  );
}

/**
 * Roda toda a camada de validacao da US02 sobre um tutorial ja aprovado no
 * schema e nas referencias: script `verify` de cada etapa, `background` de
 * `intro`/`finish`, coerencia de `points` e unicidade do `verify`.
 *
 * Puro (sem dependencia de `vscode`) para poder ser testado fora do Extension Host.
 */
export async function runEvaluationChecks(
  tutorial: TutorialDefinition,
  validator: VerifyScriptValidator,
  source?: JsonSource
): Promise<ValidationError[]> {
  const problemas: ValidationError[] = [];

  for (let i = 0; i < tutorial.details.steps.length; i++) {
    problemas.push(
      ...(await validator.validate(
        tutorial.details.steps[i],
        `/details/steps/${i}/verify`,
        source
      ))
    );
  }

  problemas.push(
    ...(await validator.validateBackground(
      tutorial.details.intro,
      '/details/intro/background',
      source
    )),
    ...(await validator.validateBackground(
      tutorial.details.finish,
      '/details/finish/background',
      source
    ))
  );

  problemas.push(...checkPointsCoherence(tutorial, source));
  problemas.push(...checkSingleVerifyKey(source));

  return problemas;
}
