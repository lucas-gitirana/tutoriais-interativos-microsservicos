import {
  parse as jsoncParse,
  parseTree,
  findNodeAtLocation,
  printParseErrorCode,
  ParseError,
  Node as JsoncNode
} from 'jsonc-parser';
import { error, ValidationError, ValidationRange } from './types';

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

  getValue(): unknown {
    return this.value;
  }

  hasTree(): boolean {
    return this.tree !== undefined;
  }

  /**
   * @param instancePath 
   * @returns 
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

  /**
   * @param prop 
   * @returns 
   */
  duplicateStepPropertyPointers(prop: string): string[] {
    if (!this.tree) {
      return [];
    }
    const stepsNode = findNodeAtLocation(this.tree, ['details', 'steps']);
    if (!stepsNode || stepsNode.type !== 'array' || !stepsNode.children) {
      return [];
    }
    const pointers: string[] = [];
    stepsNode.children.forEach((stepNode, i) => {
      if (stepNode.type !== 'object' || !stepNode.children) {
        return;
      }
      const ocorrencias = stepNode.children.filter(
        (child) => child.type === 'property' && child.children?.[0]?.value === prop
      ).length;
      if (ocorrencias > 1) {
        pointers.push(`/details/steps/${i}/${prop}`);
      }
    });
    return pointers;
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

/**
 * Traducao PT-BR das mensagens de erro de parse do jsonc-parser.
 *
 * Indexado pelo *nome* estavel do codigo (`printParseErrorCode`), nao pelo valor
 * numerico do enum `ParseErrorCode` — que pode variar entre versoes.
 */
const PARSE_ERROR_PT: Record<string, string> = {
  InvalidSymbol: 'simbolo invalido',
  InvalidNumberFormat: 'numero em formato invalido',
  PropertyNameExpected: 'nome de propriedade esperado',
  ValueExpected: 'valor esperado',
  ColonExpected: 'dois-pontos (`:`) esperado',
  CommaExpected: 'virgula (`,`) esperada — as propriedades precisam ser separadas por virgula',
  CloseBraceExpected: 'chave de fechamento (`}`) esperada',
  CloseBracketExpected: 'colchete de fechamento (`]`) esperado',
  EndOfFileExpected: 'fim de arquivo esperado',
  InvalidCommentToken: 'comentario nao e permitido em JSON',
  UnexpectedEndOfComment: 'comentario nao finalizado',
  UnexpectedEndOfString: 'texto nao finalizado (aspas de fechamento faltando)',
  UnexpectedEndOfNumber: 'numero nao finalizado',
  InvalidUnicode: 'sequencia unicode invalida',
  InvalidEscapeCharacter: 'caractere de escape invalido',
  InvalidCharacter: 'caractere invalido'
};

function describeParseError(err: ParseError): string {
  return PARSE_ERROR_PT[printParseErrorCode(err.error)] ?? 'erro de sintaxe';
}
