/**
 * Backend de referencia do registro de desempenho (US07): recebe os envios da
 * extensao "Tutoriais Interativos de Microsservicos" e grava uma linha por envio
 * na planilha Google a que este script esta vinculado.
 *
 * Instalacao: veja docs/backend-planilha/README.md.
 */

/**
 * Deve ser igual ao "token" do bloco "report" no index.json do tutorial.
 * Deixe vazio ('') para aceitar envios sem token.
 */
const TOKEN = 'troque-este-valor';

const ABA_REGISTROS = 'Registros';
const ABA_RESUMO = 'Resumo';
const CABECALHO = [
  'Recebido em',
  'Tutorial',
  'Nome',
  'Nota',
  'Nota máxima',
  'Percentual',
  'Concluído em',
  'Etapas'
];

/** Recebe o POST da extensao. Responde sempre JSON: { ok: true } ou { ok: false, erro }. */
function doPost(e) {
  try {
    const dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (TOKEN && dados.token !== TOKEN) {
      return responder({ ok: false, erro: 'Token inválido para este tutorial.' });
    }
    const problema = validar(dados);
    if (problema) {
      return responder({ ok: false, erro: problema });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const aba = abaRegistros();
      aba.appendRow([
        new Date(),
        textoSeguro(dados.tutorial),
        textoSeguro(dados.nome),
        dados.nota,
        dados.notaMaxima,
        dados.notaMaxima > 0 ? dados.nota / dados.notaMaxima : '',
        textoSeguro(dados.concluidoEm),
        textoSeguro(resumirEtapas(dados.etapas))
      ]);
      aba.getRange(aba.getLastRow(), 6).setNumberFormat('0.0%');
      try {
        atualizarResumo();
      } catch (err) {
        // O registro ja foi gravado; o resumo e refeito no proximo envio.
        console.error('Falha ao atualizar o resumo: ' + err);
      }
    } finally {
      lock.releaseLock();
    }
    return responder({ ok: true });
  } catch (err) {
    return responder({ ok: false, erro: 'Falha ao registrar: ' + err });
  }
}

/** Permite conferir no navegador se o Web App esta publicado. */
function doGet() {
  return responder({ ok: true, servico: 'registro-desempenho-tutoriais' });
}

/**
 * Execute uma vez pelo editor (Executar > configurarPlanilha) para criar as
 * abas "Registros" e "Resumo". Tambem pode ser executada a qualquer momento
 * para refazer o resumo.
 */
function configurarPlanilha() {
  abaRegistros();
  atualizarResumo();
}

/**
 * Recalcula a aba "Resumo" a partir de "Registros", uma linha por tutorial.
 * Grava valores (e nao uma formula) para funcionar em qualquer localidade da
 * planilha: em pt-BR o separador de argumentos e ';', e uma formula gravada
 * com ',' resulta em "Erro de analise de formula".
 *
 * Envios conta todas as linhas; Alunos conta nomes distintos (sem diferenciar
 * maiusculas/espacos). Media, minimo e maximo usam o ultimo envio de cada aluno.
 */
function atualizarResumo() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const registros = abaRegistros();
  const resumo = planilha.getSheetByName(ABA_RESUMO) || planilha.insertSheet(ABA_RESUMO);

  const linhas =
    registros.getLastRow() > 1
      ? registros.getRange(2, 1, registros.getLastRow() - 1, CABECALHO.length).getValues()
      : [];

  // tutorial -> { envios, ultimoPorAluno: chave -> { recebido, percentual } }
  const porTutorial = {};
  linhas.forEach(function (linha) {
    const recebido = linha[0] instanceof Date ? linha[0].getTime() : 0;
    const tutorial = String(linha[1]);
    const aluno = String(linha[2]).trim().replace(/\s+/g, ' ').toLowerCase();
    if (!tutorial || !aluno) {
      return;
    }
    const grupo = porTutorial[tutorial] || (porTutorial[tutorial] = { envios: 0, ultimoPorAluno: {} });
    grupo.envios++;
    const anterior = grupo.ultimoPorAluno[aluno];
    if (!anterior || recebido >= anterior.recebido) {
      grupo.ultimoPorAluno[aluno] = { recebido: recebido, percentual: linha[5] };
    }
  });

  const saida = [['Tutorial', 'Envios', 'Alunos', 'Média', 'Mínimo', 'Máximo']];
  Object.keys(porTutorial)
    .sort()
    .forEach(function (tutorial) {
      const grupo = porTutorial[tutorial];
      const alunos = Object.keys(grupo.ultimoPorAluno);
      const percentuais = alunos
        .map(function (aluno) {
          return grupo.ultimoPorAluno[aluno].percentual;
        })
        .filter(function (p) {
          return typeof p === 'number';
        });
      const soma = percentuais.reduce(function (a, b) {
        return a + b;
      }, 0);
      saida.push([
        tutorial,
        grupo.envios,
        alunos.length,
        percentuais.length ? soma / percentuais.length : '',
        percentuais.length ? Math.min.apply(null, percentuais) : '',
        percentuais.length ? Math.max.apply(null, percentuais) : ''
      ]);
    });

  resumo.clear();
  resumo.getRange(1, 1, saida.length, saida[0].length).setValues(saida);
  resumo.getRange(1, 1, 1, saida[0].length).setFontWeight('bold');
  resumo.setFrozenRows(1);
  if (saida.length > 1) {
    resumo.getRange(2, 4, saida.length - 1, 3).setNumberFormat('0.0%');
  }
}

function abaRegistros() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName(ABA_REGISTROS);
  if (!aba) {
    aba = planilha.insertSheet(ABA_REGISTROS);
  }
  if (aba.getLastRow() === 0) {
    aba.appendRow(CABECALHO);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, CABECALHO.length).setFontWeight('bold');
  }
  return aba;
}

function validar(dados) {
  if (typeof dados.tutorial !== 'string' || !dados.tutorial) {
    return 'Campo "tutorial" ausente.';
  }
  if (typeof dados.nome !== 'string' || !dados.nome.trim()) {
    return 'Campo "nome" ausente.';
  }
  if (typeof dados.nota !== 'number' || typeof dados.notaMaxima !== 'number') {
    return 'Campos "nota" e "notaMaxima" devem ser números.';
  }
  return '';
}

/** "✓ Etapa 1; ✗ Etapa 2; — Etapa 3" a partir da lista de etapas enviada. */
function resumirEtapas(etapas) {
  if (!Array.isArray(etapas)) {
    return '';
  }
  const simbolos = { correct: '✓', incorrect: '✗', 'not-evaluated': '—', 'no-evaluation': '·' };
  return etapas
    .map(function (etapa) {
      return (simbolos[etapa.status] || '?') + ' ' + etapa.titulo;
    })
    .join('; ');
}

/** Impede que um texto enviado vire formula na planilha (ex.: nome "=HYPERLINK(...)"). */
function textoSeguro(valor) {
  const texto = String(valor == null ? '' : valor).slice(0, 2000);
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON
  );
}
