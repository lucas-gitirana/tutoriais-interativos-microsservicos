import { TutorialDefinition } from '../model/tutorial';
import { JsonSource } from './JsonSource';
import { error, ValidationError, warning } from './types';
import { VerifyScriptValidator } from './VerifyScriptValidator';

/**
 * Avisos de coerencia entre a avaliacao automatica (`verify`) e a pontuacao
 * (`points`) de cada etapa. Nao bloqueiam a disponibilizacao do tutorial.
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

export function checkReportEndpoint(
  tutorial: TutorialDefinition,
  source?: JsonSource
): ValidationError[] {
  const endpoint = tutorial.report?.endpoint;
  if (!endpoint || !/^http:\/\//i.test(endpoint)) {
    return [];
  }
  const pointer = '/report/endpoint';
  return [
    warning(
      pointer,
      'O registro de desempenho sera enviado sem HTTPS; nome e nota trafegam em texto claro.',
      source?.rangeForPath(pointer)
    )
  ];
}

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
  problemas.push(...checkReportEndpoint(tutorial, source));

  return problemas;
}
