import * as assert from 'node:assert';
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { HttpResultReporter } from '../../evaluation/HttpResultReporter';
import { PerformanceRecord } from '../../evaluation/PerformanceRecord';

const RECORD: PerformanceRecord = {
  tutorial: 'CQRS',
  nome: 'Ana',
  nota: 10,
  notaMaxima: 25,
  etapas: [{ titulo: 'Separar', status: 'correct' }],
  concluidoEm: '2026-10-11T14:00:00.000Z',
  token: 'turma'
};

type Handler = (req: http.IncomingMessage, body: string, res: http.ServerResponse) => void;

/** Servidor HTTP local; cada teste define o comportamento via `handler`. */
async function startServer(handler: Handler): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => handler(req, Buffer.concat(chunks).toString('utf8'), res));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      })
  };
}

describe('HttpResultReporter (US07)', () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it('envia POST JSON com o registro e aceita resposta { ok: true }', async () => {
    const received: Array<{ method?: string; type?: string; body: string }> = [];
    const server = await startServer((req, body, res) => {
      received.push({ method: req.method, type: req.headers['content-type'], body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
    close = server.close;

    const result = await new HttpResultReporter().send(`${server.url}/exec`, RECORD);

    assert.deepStrictEqual(result, { ok: true });
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].method, 'POST');
    assert.match(received[0].type ?? '', /application\/json/);
    assert.deepStrictEqual(JSON.parse(received[0].body), RECORD);
  });

  it('segue o redirecionamento 302 como o /exec do Google Apps Script', async () => {
    const paths: string[] = [];
    const server = await startServer((req, _body, res) => {
      paths.push(`${req.method} ${req.url}`);
      if (req.url === '/exec') {
        res.writeHead(302, { Location: '/echo?id=1' });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
    close = server.close;

    const result = await new HttpResultReporter().send(`${server.url}/exec`, RECORD);

    assert.deepStrictEqual(result, { ok: true });
    assert.deepStrictEqual(paths, ['POST /exec', 'GET /echo?id=1']);
  });

  it('status diferente de 2xx e falha', async () => {
    const server = await startServer((_req, _body, res) => {
      res.writeHead(500);
      res.end('boom');
    });
    close = server.close;

    const result = await new HttpResultReporter().send(server.url, RECORD);
    assert.strictEqual(result.ok, false);
    assert.match((result as { message: string }).message, /HTTP 500/);
  });

  it('corpo { ok: false, erro } e falha com a mensagem do servidor', async () => {
    const server = await startServer((_req, _body, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":false,"erro":"Token inválido."}');
    });
    close = server.close;

    const result = await new HttpResultReporter().send(server.url, RECORD);
    assert.deepStrictEqual(result, { ok: false, message: 'Token inválido.' });
  });

  it('resposta HTML (Web App sem acesso publico) e falha', async () => {
    const server = await startServer((_req, _body, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html>Faça login</html>');
    });
    close = server.close;

    const result = await new HttpResultReporter().send(server.url, RECORD);
    assert.strictEqual(result.ok, false);
    assert.match((result as { message: string }).message, /Qualquer pessoa/);
  });

  it('timeout sem resposta e falha', async () => {
    const server = await startServer(() => {
      /* nunca responde */
    });
    close = server.close;

    const result = await new HttpResultReporter(200).send(server.url, RECORD);
    assert.strictEqual(result.ok, false);
    assert.match((result as { message: string }).message, /não respondeu/);
  });

  it('servidor inexistente e falha sem lancar excecao', async () => {
    const server = await startServer(() => undefined);
    const url = server.url;
    await server.close();

    const result = await new HttpResultReporter().send(url, RECORD);
    assert.strictEqual(result.ok, false);
    assert.match((result as { message: string }).message, /Não foi possível contatar/);
  });
});
