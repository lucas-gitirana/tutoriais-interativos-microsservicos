import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { FileProbe } from './FileProbe';
import { splitRelativeSegments } from './pathUtils';

/**
 * Implementacao de {@link FileProbe} baseada no `fs` do Node. Usada nos testes
 * unitarios (sem Extension Host) e em qualquer contexto puramente local.
 */
export class NodeFileProbe implements FileProbe {
  constructor(private readonly baseDir: string) {}

  async exists(relativePath: string): Promise<boolean> {
    const target = path.resolve(this.baseDir, ...splitRelativeSegments(relativePath));
    try {
      const stat = await fs.stat(target);
      return stat.isFile() || stat.isDirectory();
    } catch {
      return false;
    }
  }
}
