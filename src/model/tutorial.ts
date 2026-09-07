/**
 * Interfaces do modelo de dados de um tutorial interativo.
 *
 * Espelham 1:1 o JSON Schema de `index.json` definido em UC01 e os nomes de classe
 * do Diagrama de Classes (`.claude/diagrams/diagramas.md`):
 * `TutorialDefinition`, `TutorialDetails`, `TextBlock`, `Step`, `FileTarget`, `BackendConfig`.
 *
 * Nesta história (US01) o modelo é usado apenas para deteccao/validacao/listagem.
 * Execucao de etapas, terminal e pontuacao pertencem a UC03/UC04.
 */

/** Bloco de texto: introducao ou finalizacao do tutorial. */
export interface TextBlock {
  /** Caminho (relativo ao diretorio do index.json) para um arquivo markdown. */
  text: string;
  /** Caminho opcional para um script shell executado em segundo plano. */
  background?: string;
}

/** Arquivo (e opcionalmente linha) associado a uma etapa. */
export interface FileTarget {
  /** Caminho ou nome do arquivo a exibir para a etapa. */
  name: string;
  /** Linha a focar dentro do arquivo (>= 1). */
  line?: number;
}

/** Uma etapa do tutorial. */
export interface Step {
  /** Titulo exibido da etapa. */
  title: string;
  /** Caminho para o markdown com as instrucoes da etapa. */
  text: string;
  /** Caminho para o script de verificacao da etapa (opcional). */
  verify?: string;
  /** Arquivo alvo da etapa (opcional). */
  file?: FileTarget;
  /** Pontuacao concedida ao concluir a etapa (>= 0). */
  points?: number;
}

/** Conteudo do tutorial: introducao, etapas ordenadas e finalizacao. */
export interface TutorialDetails {
  intro: TextBlock;
  steps: Step[];
  finish: TextBlock;
}

/** Configuracao do ambiente de backend a provisionar (usado apenas na execucao, UC03). */
export interface BackendConfig {
  imageid: string;
}

/** Definicao completa de um tutorial, correspondente a um `index.json` valido. */
export interface TutorialDefinition {
  title: string;
  description: string;
  details: TutorialDetails;
  backend: BackendConfig;
}
