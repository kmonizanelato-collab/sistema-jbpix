import { BICHOS, type Bicho, bichoPorGrupo, bichoPorNome } from "./bicho";

export type Entry = {
  rank: number;
  grupo: number;
  nome: string;
  emoji: string;
  codepoint: string;
  /** Sufixo da linha: "17 DIAS" ou "SAIU ONTEM". */
  status: string;
  /** Linha final, exatamente como sai na arte. */
  text: string;
};

export type ParseResult = {
  entries: Entry[];
  errors: { line: number; raw: string; reason: string }[];
};

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu;

/**
 * Interpreta o formato que o admin cola, por exemplo:
 *
 *   1º 🦩 01 - Avestruz atrasado há 17 dias, , no milhar
 *   24º 🐇 10 - Coelho saiu ontem, , no milhar
 *
 * e devolve a linha no formato da arte:
 *
 *   1° 🦩 AVESTRUZ 17 DIAS
 *   24° 🐇 COELHO SAIU ONTEM
 *
 * O parser é deliberadamente tolerante: o emoji pode faltar (é reposto pelo
 * grupo/nome), o número do grupo pode faltar, e "1º"/"1°"/"1." são aceitos.
 * O que ele NÃO faz é adivinhar — se não achar o bicho, reporta erro em vez
 * de inventar uma linha.
 */
/**
 * Quebra uma lista corrida em linhas.
 *
 * Quando o admin copia do sistema pelo celular, tudo costuma vir grudado numa
 * linha só: "1º 🦩 01 - Avestruz ... no milhar 2º 🐐 06 - Cabra ...". Cortamos
 * antes de cada "Nº". O corte exige o indicador ordinal logo depois do número,
 * senão "01 -" e "17 dias" também virariam quebras.
 */
export function separarLista(input: string): string {
  // O corte exige o indicador ordinal logo depois do número, senão "01 -" e
  // "17 dias" também virariam quebras. O olhar-para-trás aceita letra, vírgula
  // ou ponto para o caso de vir grudado ("no milhar2º"), que acontece quando a
  // cópia perde o espaço.
  return input.replace(/(?<=[\p{L},.;)])\s*(?=\d{1,2}\s*[º°])/gu, "\n");
}

/**
 * Diz se o texto parece uma lista corrida com o Transcrever desligado.
 * Serve só para o aviso ser útil ("ligue o Transcrever") em vez de genérico.
 */
export function pareceListaCorrida(input: string): boolean {
  const linhas = input.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length > 3) return false;
  const ordinais = input.match(/\d{1,2}\s*[º°]/g);
  return (ordinais?.length ?? 0) > 3;
}

function diasTexto(n: string): string {
  return `${n} ${Number(n) === 1 ? "DIA" : "DIAS"}`;
}

/**
 * Traduz o final da linha para o sufixo que vai na arte.
 *
 * As três formas que o sistema de origem produz são "atrasado há N dias",
 * "saiu ontem" e "saiu hoje". A ordem importa: "hoje" é testado antes de
 * "ontem" só por clareza, mas os padrões não se sobrepõem.
 */
function lerStatus(texto: string): string | null {
  const dias = texto.match(/atrasad[oa]s?\s+h[áa]\s+(\d+)\s*dias?/i);
  if (dias) return diasTexto(dias[1]);
  if (/saiu\s+hoje/i.test(texto)) return "SAIU HOJE";
  if (/saiu\s+ontem/i.test(texto)) return "SAIU ONTEM";
  // Última tentativa: um "N dias" solto, sem o "atrasado há" na frente.
  const soltos = texto.match(/(\d+)\s*dias?\b/i);
  return soltos ? diasTexto(soltos[1]) : null;
}

export function parseEntries(
  input: string,
  opcoes: { transcrever?: boolean } = {}
): ParseResult {
  const entries: Entry[] = [];
  const errors: ParseResult["errors"] = [];

  const texto = opcoes.transcrever ? separarLista(input) : input;
  const lines = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  lines.forEach((raw, i) => {
    const lineNo = i + 1;

    // 1) posição no ranking
    const rankMatch = raw.match(/^(\d{1,2})\s*[º°.\-)]?\s*/);
    if (!rankMatch) {
      errors.push({ line: lineNo, raw, reason: "não começa com a posição (1º, 2º, ...)" });
      return;
    }
    const rank = Number(rankMatch[1]);
    let rest = raw.slice(rankMatch[0].length);

    // 2) emoji, se veio (é reposto pelo nosso mapa de qualquer forma)
    rest = rest.replace(EMOJI_RE, " ").trim();

    // 3) status: "atrasado há N dias", "saiu ontem" ou "saiu hoje"
    const status = lerStatus(rest);
    if (!status) {
      errors.push({
        line: lineNo,
        raw,
        reason: 'não achei "atrasado há N dias", "saiu ontem" nem "saiu hoje"',
      });
      return;
    }

    // 4) bicho — primeiro pelo nome (mais confiável), depois pelo número do grupo
    const head = rest.split(/atrasad|saiu/i)[0];
    let bicho: Bicho | undefined;

    for (const palavra of head.match(/[A-Za-zÀ-ÿ]{3,}/g) ?? []) {
      const achado = bichoPorNome(palavra);
      if (achado) {
        bicho = achado;
        break;
      }
    }
    if (!bicho) {
      const grupoMatch = head.match(/(?:^|\s)(\d{1,2})\s*[-–—]/);
      if (grupoMatch) bicho = bichoPorGrupo(Number(grupoMatch[1]));
    }
    if (!bicho) {
      errors.push({ line: lineNo, raw, reason: "não reconheci o bicho" });
      return;
    }

    entries.push({
      rank,
      grupo: bicho.grupo,
      nome: bicho.nome,
      emoji: bicho.emoji,
      codepoint: bicho.codepoint,
      status,
      text: `${rank}° ${bicho.emoji} ${bicho.nome} ${status}`,
    });
  });

  entries.sort((a, b) => a.rank - b.rank);
  return { entries, errors };
}

/** Avisos que não impedem gravar, mas que o admin deve ver antes de publicar. */
export function validateEntries(entries: Entry[]): string[] {
  const avisos: string[] = [];
  if (entries.length === 0) return ["Nenhuma linha reconhecida."];

  const ranks = entries.map((e) => e.rank);
  const duplicadas = ranks.filter((r, i) => ranks.indexOf(r) !== i);
  if (duplicadas.length) avisos.push(`Posições repetidas: ${[...new Set(duplicadas)].join(", ")}`);

  for (let i = 0; i < entries.length; i++) {
    if (entries[i].rank !== i + 1) {
      avisos.push(`A numeração pula: esperava ${i + 1}º e veio ${entries[i].rank}º.`);
      break;
    }
  }

  const grupos = entries.map((e) => e.grupo);
  const repetidos = grupos.filter((g, i) => grupos.indexOf(g) !== i);
  if (repetidos.length) {
    const nomes = [...new Set(repetidos)].map((g) => bichoPorGrupo(g)?.nome ?? g);
    avisos.push(`Bicho repetido: ${nomes.join(", ")}`);
  }

  if (entries.length !== BICHOS.length) {
    avisos.push(`A lista tem ${entries.length} linhas (o normal são ${BICHOS.length}).`);
  }
  return avisos;
}
