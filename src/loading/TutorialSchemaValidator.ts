import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { error, ValidationError, ValidationResult } from './types';
import { loadTutorialSchema } from './schema';

/**
 * Valida um objeto JSON contra o JSON Schema draft-07 de `index.json` (UC01).
 *
 * O schema e compilado uma unica vez no construtor. Cada erro do Ajv e
 * convertido para um {@link ValidationError} com `path` no estilo JSON Pointer
 * e mensagem legivel em portugues (Brasil). O mapeamento posicional (linha/
 * coluna) e responsabilidade do chamador, a partir do `path`.
 */
export class TutorialSchemaValidator {
  private readonly validateFn: ValidateFunction;

  constructor(schema: Record<string, unknown> = loadTutorialSchema()) {
    const ajv = new Ajv({
      allErrors: true,
      strict: false,
      strictSchema: false
    });
    addFormats(ajv);
    this.validateFn = ajv.compile(schema);
  }

  validate(json: unknown): ValidationResult {
    const ok = this.validateFn(json);
    if (ok) {
      return { valid: true, errors: [] };
    }
    const rawErrors = this.validateFn.errors ?? [];
    const errors = dedupe(rawErrors.map((e) => translate(e)));
    return { valid: errors.length === 0, errors };
  }
}

function translate(e: ErrorObject): ValidationError {
  const base = e.instancePath === '' ? '/' : e.instancePath;

  switch (e.keyword) {
    case 'required': {
      const prop = String((e.params as { missingProperty: string }).missingProperty);
      return error(joinPointer(base, prop), `Campo obrigatorio ausente: '${prop}'.`);
    }
    case 'additionalProperties': {
      const prop = String(
        (e.params as { additionalProperty: string }).additionalProperty
      );
      return error(
        joinPointer(base, prop),
        `Propriedade nao reconhecida pelo schema: '${prop}'.`
      );
    }
    case 'type': {
      const expected = translateType(String((e.params as { type: string }).type));
      return error(base, `Tipo invalido em ${describePath(base)}: esperado ${expected}.`);
    }
    case 'minItems': {
      const limit = (e.params as { limit: number }).limit;
      return error(
        base,
        `A lista em ${describePath(base)} deve ter no minimo ${limit} item(ns).`
      );
    }
    case 'minimum': {
      const limit = (e.params as { limit: number }).limit;
      return error(
        base,
        `O valor em ${describePath(base)} deve ser maior ou igual a ${limit}.`
      );
    }
    case 'maximum': {
      const limit = (e.params as { limit: number }).limit;
      return error(
        base,
        `O valor em ${describePath(base)} deve ser menor ou igual a ${limit}.`
      );
    }
    case 'enum': {
      return error(base, `Valor nao permitido em ${describePath(base)}.`);
    }
    default: {
      const msg = e.message ? `: ${e.message}` : '';
      return error(base, `Valor invalido em ${describePath(base)}${msg}.`);
    }
  }
}

function translateType(t: string): string {
  const map: Record<string, string> = {
    string: 'texto',
    integer: 'numero inteiro',
    number: 'numero',
    object: 'objeto',
    array: 'lista',
    boolean: 'booleano',
    null: 'nulo'
  };
  return map[t] ?? t;
}

function describePath(pointer: string): string {
  return pointer === '/' ? 'raiz do documento' : `'${pointer}'`;
}

function joinPointer(base: string, prop: string): string {
  const escaped = prop.replace(/~/g, '~0').replace(/\//g, '~1');
  return base === '/' ? `/${escaped}` : `${base}/${escaped}`;
}

/** Remove erros duplicados (mesmo path + mensagem), preservando a ordem. */
function dedupe(errors: ValidationError[]): ValidationError[] {
  const seen = new Set<string>();
  const out: ValidationError[] = [];
  for (const err of errors) {
    const key = `${err.severity}|${err.path}|${err.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(err);
    }
  }
  return out;
}
