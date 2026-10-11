/**
 * Interfaces do modelo de dados de um tutorial interativo.
 * Espelham 1:1 o JSON Schema de `index.json`
 */

export interface TextBlock {
  text: string;
  background?: string;
}

export interface FileTarget {
  name: string;
  line?: number;
}

export interface Step {
  title: string;
  text: string;
  verify?: string;
  file?: FileTarget;
  points?: number;
}

export interface TutorialDetails {
  intro: TextBlock;
  steps: Step[];
  finish: TextBlock;
}

export interface BackendConfig {
  imageid: string;
}

export interface ReportConfig {
  endpoint: string;
  token?: string;
}

export interface TutorialDefinition {
  title: string;
  description: string;
  details: TutorialDetails;
  backend: BackendConfig;
  report?: ReportConfig;
}
