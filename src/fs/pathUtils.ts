/**
 * Quebra um caminho relativo (citado no `index.json`) em segmentos, ignorando
 * segmentos vazios e `.`. Mantem `..` para que a resolucao cross-platform seja
 * feita por `Uri.joinPath`.
 */
export function splitRelativeSegments(relativePath: string): string[] {
  return relativePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg.length > 0 && seg !== '.');
}

export function depthOf(posixPath: string): number {
  const normalized = posixPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.length === 0) {
    return 0;
  }
  return normalized.split('/').length - 1;
}

export interface IndexJsonChoice {
  chosen?: string;
  ambiguous: boolean;
}

/**
 * Escolhe o `index.json` de menor profundidade (mais proximo da raiz do
 * workspace). Em caso de empate ou de multiplos candidatos, retorna o primeiro
 * (apos ordenacao estavel) e marca `ambiguous: true`.
 */
export function pickIndexJson(paths: string[]): IndexJsonChoice {
  if (paths.length === 0) {
    return { ambiguous: false };
  }
  const sorted = [...paths].sort((a, b) => {
    const d = depthOf(a) - depthOf(b);
    return d !== 0 ? d : a.localeCompare(b);
  });
  return { chosen: sorted[0], ambiguous: paths.length > 1 };
}
