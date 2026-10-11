import { PerformanceRecord } from './PerformanceRecord';
import { ReportResult, ResultReporter } from './ResultReporter';

export const REPORT_TIMEOUT_MS = 15_000;

/**
 * Envia o registro via HTTP POST com corpo JSON (usa o `fetch` nativo do Node).
 */
export class HttpResultReporter implements ResultReporter {
  constructor(private readonly timeoutMs: number = REPORT_TIMEOUT_MS) {}

  async send(endpoint: string, record: PerformanceRecord): Promise<ReportResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(record),
        redirect: 'follow',
        signal: controller.signal
      });
      const body = await response.text();
      if (!response.ok) {
        return { ok: false, message: `O servidor respondeu com erro (HTTP ${response.status}).` };
      }
      return interpretBody(body, response.headers.get('content-type') ?? '');
    } catch (err) {
      if (controller.signal.aborted) {
        return {
          ok: false,
          message: `O servidor não respondeu em ${Math.round(this.timeoutMs / 1000)} s.`
        };
      }
      return {
        ok: false,
        message: `Não foi possível contatar o servidor (${describeError(err)}).`
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

function interpretBody(body: string, contentType: string): ReportResult {
  if (contentType.includes('text/html')) {
    return {
      ok: false,
      message:
        'Resposta inesperada do servidor (HTML). Verifique se o Web App está publicado com acesso "Qualquer pessoa".'
    };
  }
  if (body.trim().length === 0) {
    return { ok: true };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: true };
  }
  if (parsed && typeof parsed === 'object' && (parsed as { ok?: unknown }).ok === false) {
    const erro = (parsed as { erro?: unknown }).erro;
    return {
      ok: false,
      message: typeof erro === 'string' && erro.length > 0 ? erro : 'O servidor recusou o registro.'
    };
  }
  return { ok: true };
}

function describeError(err: unknown): string {
  const cause = (err as { cause?: { code?: string } })?.cause;
  if (cause?.code) {
    return cause.code;
  }
  return err instanceof Error ? err.message : String(err);
}
