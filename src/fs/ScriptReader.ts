/**
 * Le o conteudo de um script referenciado pelo `index.json`, ja vinculado ao
 * diretorio do `index.json`. Analogo ao {@link FileProbe}, mas para leitura de conteudo de arquivos.
 */
export interface ScriptReader {
  read(relativePath: string): Promise<string | undefined>;
}
