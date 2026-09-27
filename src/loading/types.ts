import type { Uri } from 'vscode';
import type { TutorialDefinition } from '../model/tutorial';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationRange {
  line: number;
  character: number;
  endLine: number;
  endCharacter: number;
}

export interface ValidationError {
  path: string;
  message: string;
  severity: ValidationSeverity;
  range?: ValidationRange;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface LoadResultNone {
  status: 'none';
}

export interface LoadResultOk {
  status: 'ok';
  tutorial: TutorialDefinition;
  tutorialDir: string;
  indexUri: Uri;
  warnings: ValidationError[];
}

export interface LoadResultInvalid {
  status: 'invalid';
  errors: ValidationError[];
  indexUri: Uri;
}

export type LoadResult = LoadResultNone | LoadResultOk | LoadResultInvalid;

export function error(path: string, message: string, range?: ValidationRange): ValidationError {
  return { path, message, severity: 'error', range };
}

export function warning(path: string, message: string, range?: ValidationRange): ValidationError {
  return { path, message, severity: 'warning', range };
}
