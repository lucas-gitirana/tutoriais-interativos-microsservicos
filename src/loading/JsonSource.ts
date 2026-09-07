import {
  parse as jsoncParse,
  parseTree,
  findNodeAtLocation,
  ParseError,
  Node as JsoncNode
} from 'jsonc-parser';
import { error, ValidationError, ValidationRange } from './types';

/**
 * Parser posicional do `index.json`.
 *
 * Faz o parse tolerante do texto e permite mapear um caminho de instancia
 * (estilo JSON Pointer, como o `instancePath` do Ajv) para um intervalo
 * linha/coluna dentro do arquivo, alimentando os diagnosticos do editor.
 */
export class JsonSource {
  private readonly lineStarts: number[];

  private constructor(
    private readonly text: string,
    private readonly value: unknown,
    private readonly tree: JsoncNode | undefined
  ) {
    this.lineStarts = computeLineStarts(text);
  }

  /**
   * Faz o parse do texto do `index.json`.
   *
   * @returns o `JsonSource` e a lista de erros de sintaxe encontrados. Quando o
   * JSON esta sintaticamente malformado, `parseErrors` contem exatamente um erro
   * na posicao do primeiro problema de parse.
   */
  static parse(text: string): { source: JsonSource; parseErrors: ValidationError[] } {
    const errors: ParseError[] = [];
    const value = jsoncParse(text, errors, {
      allowTrailingComma: false,
      disallowComments: true
    });
    const tree = parseTree(text, [], {
      allowTrailingComma: false,
      disallowComments: true
    });
    const source = new JsonSource(text, value, tree);

    const parseErrors: ValidationError[] = [];
    if (errors.length > 0) {
      const first = errors[0];
      const range = source.rangeForOffset(first.offset, Math.max(first.length, 1));
      parseErrors.push(
        error('/', `JSON malformado: ${describeParseError(first)}.`, range)
      );
    }
    return { source, parseErrors };
  }

  /** Valor JavaScript resultante do parse (pode ser parcial se houver erros). */
  getValue(): unknown {
    return this.value;
  }

  /** `true` quando o parse produziu uma raiz de objeto utilizavel. */
  hasTree(): boolean {
    return this.tree !== undefined;
  }

  /**
   * Intervalo do *valor* associado a um caminho de instancia.
   *
   * @param instancePath caminho estilo JSON Pointer (`/details/steps/0/points`).
   *   String vazia ou `/` referem-se a raiz.
   */
  rangeForPath(instancePath: string): ValidationRange | undefined {
    if (!this.tree) {
      return undefined;
    }
    const segments = toSegments(instancePath);
    const node =
      segments.length === 0
        ? this.tree
        : findNodeAtLocation(this.tree, segments);
    if (!node) {
      // Tenta o container mais proximo (util para "propriedade obrigatoria ausente").
      const parent = findClosestExistingNode(this.tree, segments);
      if (!parent) {
        return this.rangeForOffset(this.tree.offset, this.tree.length);
      }
      return this.rangeForOffset(parent.offset, parent.length);
    }
    return this.rangeForOffset(node.offset, node.length);
  }

  private rangeForOffset(offset: number, length: number): ValidationRange {
    const start = this.positionAt(offset);
    const end = this.positionAt(offset + length);
    return {
      line: start.line,
      character: start.character,
      endLine: end.line,
      endCharacter: end.character
    };
  }

  private positionAt(offset: number): { line: number; character: number } {
    const clamped = Math.max(0, Math.min(offset, this.text.length));
    // Busca binaria pela ultima linha cujo inicio <= clamped.
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (this.lineStarts[mid] <= clamped) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return { line: low, character: clamped - this.lineStarts[low] };
  }
}

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (ch === 10 /* \n */) {
      starts.push(i + 1);
    } else if (ch === 13 /* \r */) {
      if (text.charCodeAt(i + 1) === 10) {
        i++;
      }
      starts.push(i + 1);
    }
  }
  return starts;
}

/** Converte um `instancePath` (JSON Pointer) em segmentos para o jsonc-parser. */
export function toSegments(instancePath: string): Array<string | number> {
  if (!instancePath || instancePath === '/') {
    return [];
  }
  return instancePath
    .split('/')
    .slice(1)
    .map((raw) => {
      const unescaped = raw.replace(/~1/g, '/').replace(/~0/g, '~');
      return /^\d+$/.test(unescaped) ? Number(unescaped) : unescaped;
    });
}

function findClosestExistingNode(
  root: JsoncNode,
  segments: Array<string | number>
): JsoncNode | undefined {
  for (let i = segments.length - 1; i >= 0; i--) {
    const node = findNodeAtLocation(root, segments.slice(0, i));
    if (node) {
      return node;
    }
  }
  return root;
}

function describeParseError(err: ParseError): string {
  const map: Record<number, string> = {
    1: 'simbolo inesperado',
    2: 'nome de propriedade esperado',
    3: 'dois-pontos esperado',
    4: 'virgula esperada',
    5: 'chave de fechamento `}` esperada',
    6: 'colchete de fechamento `]` esperado',
    7: 'fim de arquivo esperado',
    8: 'comentario nao permitido',
    9: 'virgula ou `}` esperada',
    10: 'virgula ou `]` esperada',
    11: 'aspas de fechamento esperadas',
    12: 'literal invalido',
    13: 'caractere invalido',
    14: 'caractere de escape invalido',
    15: 'sequencia unicode invalida',
    16: 'numero invalido'
  };
  return map[err.error] ?? 'erro de sintaxe';
}
