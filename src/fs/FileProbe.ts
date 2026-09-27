/**
 * Abstracao de acesso ao sistema de arquivos, ja vinculada ao diretorio do
 * `index.json`. Permite que o `ReferenceValidator` seja testado com o `fs` do
 * Node (fora do Extension Host) e execute com `workspace.fs` em producao —
 * inclusive em GitHub Codespaces / remoto.
 */
export interface FileProbe {
  exists(relativePath: string): Promise<boolean>;
}
