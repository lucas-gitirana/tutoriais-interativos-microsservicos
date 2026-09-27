import * as fs from 'node:fs';
import * as path from 'node:path';

export function loadTutorialSchema(): Record<string, unknown> {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'schema', 'tutorial.schema.json');
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, 'utf8')) as Record<string, unknown>;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    'Nao foi possivel localizar schema/tutorial.schema.json a partir de ' + __dirname
  );
}
