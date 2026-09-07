import type { Uri } from 'vscode';
import type { TutorialDefinition } from '../model/tutorial';

/** Severidade de um problema de validacao. */
export type ValidationSeverity = 'error' | 'warning';

/** Intervalo (0-based) dentro do `index.json` associado a um problema. */
export interface ValidationRange {
  line: number;
  character: number;
  endLine: number;
  endCharacter: number;
}

/** Um problema de validacao do `index.json` ou de suas referencias. */
export interface ValidationError {
  /** Caminho da instancia (estilo JSON Pointer), ex.: `/details/steps/0/points`. `/` para a raiz. */
  path: string;
  /** Mensagem legivel em portugues (Brasil). */
  message: string;
  severity: ValidationSeverity;
  /** Posicao no arquivo, quando disponivel. */
  range?: ValidationRange;
}

/** Resultado de uma etapa de validacao (schema ou referencias). */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** Nenhum `index.json` encontrado no workspace (nao e um erro). */
export interface LoadResultNone {
  status: 'none';
}

/** `index.json` encontrado e valido (o tutorial fica disponivel para execucao). */
export interface LoadResultOk {
  status: 'ok';
  tutorial: TutorialDefinition;
  /** Diretorio do `index.json`, base para resolucao de caminhos relativos. */
  tutorialDir: string;
  indexUri: Uri;
  /** Avisos nao bloqueantes (ex.: `file.name` inexistente). */
  warnings: ValidationError[];
}

/** `index.json` encontrado, porem invalido. */
export interface LoadResultInvalid {
  status: 'invalid';
  errors: ValidationError[];
  indexUri: Uri;
}

/** Uniao discriminada com os tres desfechos possiveis de uma carga. */
export type LoadResult = LoadResultNone | LoadResultOk | LoadResultInvalid;

/** Cria um `ValidationError` de severidade `error`. */
export function error(path: string, message: string, range?: ValidationRange): ValidationError {
  return { path, message, severity: 'error', range };
}

/** Cria um `ValidationError` de severidade `warning`. */
export function warning(path: string, message: string, range?: ValidationRange): ValidationError {
  return { path, message, severity: 'warning', range };
}
