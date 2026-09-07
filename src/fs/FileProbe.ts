/**
 * Abstracao de acesso ao sistema de arquivos, ja vinculada ao diretorio do
 * `index.json`. Permite que o `ReferenceValidator` seja testado com o `fs` do
 * Node (fora do Extension Host) e execute com `workspace.fs` em producao —
 * inclusive em GitHub Codespaces / remoto (RNF04/RNF05).
 */
export interface FileProbe {
  /**
   * Resolve `relativePath` a partir do diretorio do `index.json` e informa se o
   * arquivo existe.
   */
  exists(relativePath: string): Promise<boolean>;
}
