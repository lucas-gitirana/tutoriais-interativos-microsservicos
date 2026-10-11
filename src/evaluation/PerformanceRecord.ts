import { StepStatus } from '../controller/types';
import { TutorialDefinition } from '../model/tutorial';
import { FinishSummaryStatus, getSummary, getTotalScore } from './ScoreTracker';

export interface PerformanceRecordStep {
  titulo: string;
  status: FinishSummaryStatus;
}

export interface PerformanceRecord {
  tutorial: string;
  nome: string;
  nota: number;
  notaMaxima: number;
  etapas: PerformanceRecordStep[];
  concluidoEm: string;
  token?: string;
}

export const NOME_MAX = 100;

export type NameValidation = { ok: true; nome: string } | { ok: false; message: string };

export function validateStudentName(nome: string): NameValidation {
  const nomeLimpo = nome.trim().replace(/\s+/g, ' ');
  if (nomeLimpo.length === 0) {
    return { ok: false, message: 'Informe seu nome.' };
  }
  if (nomeLimpo.length > NOME_MAX) {
    return { ok: false, message: `O nome deve ter no máximo ${NOME_MAX} caracteres.` };
  }
  return { ok: true, nome: nomeLimpo };
}

export function buildPerformanceRecord(
  tutorial: TutorialDefinition,
  statuses: ReadonlyMap<number, StepStatus>,
  nome: string,
  now: Date
): PerformanceRecord {
  const steps = tutorial.details.steps;
  const score = getTotalScore(steps, statuses);
  const record: PerformanceRecord = {
    tutorial: tutorial.title,
    nome,
    nota: score.total,
    notaMaxima: score.possible,
    etapas: getSummary(steps, statuses).map((item) => ({
      titulo: item.title,
      status: item.status
    })),
    concluidoEm: now.toISOString()
  };
  if (tutorial.report?.token) {
    record.token = tutorial.report.token;
  }
  return record;
}

/**
 * Nome do arquivo local gravado quando o envio falha, para o aluno entregar
 * o resultado por outro meio. Nao inclui o token.
 */
export function fallbackFileName(record: PerformanceRecord): string {
  return `resultado-${slugify(record.tutorial)}-${slugify(record.nome)}.json`;
}

export function fallbackFileContent(record: PerformanceRecord): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { token, ...semToken } = record;
  return JSON.stringify(semToken, null, 2) + '\n';
}

function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'tutorial';
}
