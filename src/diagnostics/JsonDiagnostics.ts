import * as vscode from 'vscode';
import { ValidationError } from '../loading/types';

const SOURCE = 'Tutoriais Interativos';

/**
 * Encapsula a `DiagnosticCollection` do `index.json`, convertendo cada
 * {@link ValidationError} num `vscode.Diagnostic` posicionado.
 */
export class JsonDiagnostics implements vscode.Disposable {
  private readonly collection: vscode.DiagnosticCollection;

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('tutoriais');
  }
  
  publish(indexUri: vscode.Uri, errors: ValidationError[]): void {
    if (errors.length === 0) {
      this.collection.delete(indexUri);
      return;
    }
    this.collection.set(indexUri, errors.map(toDiagnostic));
  }
  
  clear(): void {
    this.collection.clear();
  }

  dispose(): void {
    this.collection.dispose();
  }
}

function toDiagnostic(err: ValidationError): vscode.Diagnostic {
  const range = err.range
    ? new vscode.Range(
        err.range.line,
        err.range.character,
        err.range.endLine,
        err.range.endCharacter
      )
    : new vscode.Range(0, 0, 0, 0);

  const severity =
    err.severity === 'warning'
      ? vscode.DiagnosticSeverity.Warning
      : vscode.DiagnosticSeverity.Error;

  const diagnostic = new vscode.Diagnostic(range, err.message, severity);
  diagnostic.source = SOURCE;
  if (err.path && err.path !== '/') {
    diagnostic.code = err.path;
  }
  return diagnostic;
}
