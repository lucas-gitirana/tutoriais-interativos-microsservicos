import { PerformanceRecord } from './PerformanceRecord';

export type ReportResult = { ok: true } | { ok: false; message: string };

export interface ResultReporter {
  send(endpoint: string, record: PerformanceRecord): Promise<ReportResult>;
}
