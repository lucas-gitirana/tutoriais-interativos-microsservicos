import { FileProbe } from '../fs/FileProbe';
import { TutorialDefinition } from '../model/tutorial';
import { JsonSource } from './JsonSource';
import { error, ValidationError, warning } from './types';

interface Ref {
  value: string;
  pointer: string;
  kind: 'markdown' | 'script' | 'fileTarget';
}

/**
 * Valida a *existencia* dos arquivos referenciados pelo `index.json`:
 *
 * - markdown de `intro` / `finish` / cada `steps[i].text`  -> obrigatorio (error)
 * - scripts `intro.background` / `finish.background` / `steps[i].verify` -> obrigatorio se presente (error)
 * - `steps[i].file.name` -> se presente, apenas aviso (warning) — nao bloqueia a disponibilizacao
 */
export class ReferenceValidator {
  constructor(private readonly probe: FileProbe) {}

  async validate(
    tutorial: TutorialDefinition,
    source?: JsonSource
  ): Promise<ValidationError[]> {
    const refs = collectRefs(tutorial);
    const results = await Promise.all(
      refs.map(async (ref) => {
        const found = await this.probe.exists(ref.value);
        if (found) {
          return undefined;
        }
        return toError(ref, source);
      })
    );
    return results.filter((e): e is ValidationError => e !== undefined);
  }
}

function collectRefs(tutorial: TutorialDefinition): Ref[] {
  const refs: Ref[] = [];
  const { details } = tutorial;

  refs.push({ value: details.intro.text, pointer: '/details/intro/text', kind: 'markdown' });
  if (details.intro.background) {
    refs.push({
      value: details.intro.background,
      pointer: '/details/intro/background',
      kind: 'script'
    });
  }

  details.steps.forEach((step, i) => {
    refs.push({
      value: step.text,
      pointer: `/details/steps/${i}/text`,
      kind: 'markdown'
    });
    if (step.verify) {
      refs.push({
        value: step.verify,
        pointer: `/details/steps/${i}/verify`,
        kind: 'script'
      });
    }
    if (step.file?.name) {
      refs.push({
        value: step.file.name,
        pointer: `/details/steps/${i}/file/name`,
        kind: 'fileTarget'
      });
    }
  });

  refs.push({ value: details.finish.text, pointer: '/details/finish/text', kind: 'markdown' });
  if (details.finish.background) {
    refs.push({
      value: details.finish.background,
      pointer: '/details/finish/background',
      kind: 'script'
    });
  }

  return refs;
}

function toError(ref: Ref, source?: JsonSource): ValidationError {
  const range = source?.rangeForPath(ref.pointer);
  switch (ref.kind) {
    case 'markdown':
      return error(
        ref.pointer,
        `Arquivo markdown nao encontrado: '${ref.value}' (referenciado em '${ref.pointer}').`,
        range
      );
    case 'script':
      return error(
        ref.pointer,
        `Script shell nao encontrado: '${ref.value}' (referenciado em '${ref.pointer}').`,
        range
      );
    case 'fileTarget':
      return warning(
        ref.pointer,
        `Arquivo alvo da etapa nao encontrado: '${ref.value}'. A etapa sera listada mesmo assim.`,
        range
      );
  }
}
