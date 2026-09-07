import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ScriptReader } from './ScriptReader';
import { splitRelativeSegments } from './pathUtils';

/**
 * {@link ScriptReader} baseado no `fs` do Node. Usado nos testes unitarios (sem
 * Extension Host) e em qualquer contexto puramente local.
 */
export class NodeScriptReader implements ScriptReader {
  constructor(private readonly baseDir: string) {}

  async read(relativePath: string): Promise<string | undefined> {
    const target = path.resolve(this.baseDir, ...splitRelativeSegments(relativePath));
    try {
      return await fs.readFile(target, 'utf8');
    } catch {
      return undefined;
    }
  }
}
