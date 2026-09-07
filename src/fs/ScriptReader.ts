/**
 * Le o conteudo de um script referenciado pelo `index.json`, ja vinculado ao
 * diretorio do `index.json`. Analogo ao {@link FileProbe}, mas devolve o texto —
 * a *existencia* continua sendo checada pelo `ReferenceValidator`; aqui o
 * conteudo alimenta o {@link VerifyScriptValidator} (shebang, sintaxe).
 *
 * `NodeScriptReader` (fs do Node) e usado nos testes e localmente;
 * `VscodeScriptReader` (`workspace.fs`) roda em producao, inclusive em GitHub
 * Codespaces / remoto (RNF04/RNF05).
 */
export interface ScriptReader {
  /**
   * Resolve `relativePath` a partir do diretorio do `index.json` e devolve o
   * conteudo do arquivo, ou `undefined` se ele nao existir / nao puder ser lido.
   */
  read(relativePath: string): Promise<string | undefined>;
}
