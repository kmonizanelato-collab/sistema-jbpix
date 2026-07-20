import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import opentype from "opentype.js";
import type { Entry } from "./parse";
import type { Box } from "./detect";

/*
  Como o texto é desenhado
  ────────────────────────
  Nada de fonte de sistema: o texto vira contorno vetorial pelo opentype.js e
  sai como <path> num SVG. Isso é o que garante que a arte fique idêntica na
  sua máquina e na Vercel — o servidor da Vercel não tem fonte nenhuma
  instalada, e SVG com <text> dependeria do fontconfig do sistema.

  Os emojis são SVG do Twemoji, compostos um a um pelo sharp.
*/

const FONTES = [
  "Now-Bold.otf", // preferida: a fonte real da arte, quando o arquivo existir
  "Now-Bold.ttf",
  "Poppins-Bold.ttf", // aproximação enquanto a Now não chega
];

let fonteCache: { font: opentype.Font; arquivo: string } | null = null;

export function carregarFonte(): { font: opentype.Font; arquivo: string } {
  if (fonteCache) return fonteCache;
  const dir = join(process.cwd(), "assets", "fonts");
  for (const nome of FONTES) {
    const caminho = join(dir, nome);
    if (!existsSync(caminho)) continue;
    const buf = readFileSync(caminho);
    const font = opentype.parse(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    );
    fonteCache = { font, arquivo: nome };
    return fonteCache;
  }
  throw new Error(
    `Nenhuma fonte encontrada em assets/fonts. Esperado um destes: ${FONTES.join(", ")}`
  );
}

/** Tipografia de uma tabela. Tudo em pixels da imagem original. */
export type Typography = {
  /** x onde cada linha começa. */
  left: number;
  /** Baseline da primeira linha. */
  firstBaseline: number;
  /** Distância entre baselines. */
  lineHeight: number;
  fontSize: number;
  emojiSize: number;
  /** Respiro antes e depois do emoji. */
  emojiGap: number;
  color: string;
};

export type LayoutBox = Box & { type: Typography };

/**
 * Tipografia inicial deduzida da caixa: a arte sempre encaixa as 25 linhas
 * ocupando a altura útil do painel. O admin ajusta na tela se precisar.
 */
export function typographyPadrao(box: Box, linhas = 25): Typography {
  // Começa logo abaixo do título medido na própria arte, com uma folga. O
  // fallback cobre caixas gravadas antes de existir a medição do título.
  const titleBottom = Number.isFinite(box.titleBottom) ? box.titleBottom : box.y + 52;
  const topo = Math.max(40, titleBottom - box.y + 10);
  const util = box.h - topo - 10;
  const lineHeight = util / linhas;
  const fontSize = Math.round(lineHeight * 0.74);
  return {
    left: box.x + Math.round(box.w * 0.02),
    firstBaseline: Math.round(box.y + topo + lineHeight * 0.72),
    lineHeight: Math.round(lineHeight * 100) / 100,
    fontSize,
    emojiSize: Math.round(fontSize * 1.12),
    emojiGap: Math.round(fontSize * 0.22),
    color: "#ffffff",
  };
}

function largura(font: opentype.Font, texto: string, size: number): number {
  return font.getAdvanceWidth(texto, size);
}

/**
 * Distância entre linhas de fato usada ao desenhar.
 *
 * A tipografia é calculada supondo 25 linhas, que é o normal. Se vier mais que
 * isso, usar o passo original jogaria as últimas linhas para fora da caixa, em
 * cima das barras de prêmio — estragando a arte. Aqui o passo encolhe só o
 * necessário para a última baseline continuar dentro do painel. Com 25 ou menos
 * nada muda, e o resultado fica idêntico ao de sempre.
 */
export function passoDeLinha(box: Box & { type: Typography }, linhas: number): number {
  if (linhas <= 1) return box.type.lineHeight;
  const ultimaBaseline = box.y + box.h - 8;
  const cabe = (ultimaBaseline - box.type.firstBaseline) / (linhas - 1);
  return Math.min(box.type.lineHeight, Math.max(6, cabe));
}

export type Ajuste = {
  fontSize: number;
  emojiSize: number;
  emojiGap: number;
  passo: number;
  /** 1 = nada foi reduzido. */
  escalaLargura: number;
  /** true = o passo entre linhas teve de encolher. */
  comprimido: boolean;
};

/**
 * Acerta tipografia e passo para o conteúdo caber na caixa.
 *
 * Nomes longos como "BORBOLETA SAIU ONTEM" passam da largura do painel e o
 * texto sai por cima da moldura, sujando a arte. Em vez de deixar vazar (ou de
 * recusar o conteúdo), reduzimos a fonte da tabela inteira pelo mínimo
 * necessário — a largura do texto é proporcional ao corpo, então basta uma
 * regra de três. Reduzir a tabela toda, e não só a linha grande, é o que mantém
 * o alinhamento; e quando tudo já cabe, a escala é 1 e nada muda.
 */
export function ajustarParaCaber(box: LayoutBox, entries: Entry[]): Ajuste {
  const t = box.type;
  const passo = passoDeLinha(box, entries.length);
  const base: Ajuste = {
    fontSize: t.fontSize,
    emojiSize: t.emojiSize,
    emojiGap: t.emojiGap,
    passo,
    escalaLargura: 1,
    comprimido: passo < t.lineHeight - 0.5,
  };
  if (entries.length === 0) return base;

  const { font } = carregarFonte();
  const disponivel = box.x + box.w - 8 - t.left;
  let maior = 0;
  for (const e of entries) {
    const w =
      largura(font, `${e.rank}° `, t.fontSize) +
      t.emojiGap * 2 +
      t.emojiSize +
      largura(font, `${e.nome} ${e.status}`, t.fontSize);
    if (w > maior) maior = w;
  }
  if (maior <= disponivel || maior === 0) return base;

  const escala = disponivel / maior;
  return {
    ...base,
    fontSize: t.fontSize * escala,
    emojiSize: Math.max(8, Math.round(t.emojiSize * escala)),
    emojiGap: t.emojiGap * escala,
    escalaLargura: escala,
  };
}

const n = (v: number) => {
  if (!Number.isFinite(v)) throw new Error(`Coordenada inválida no contorno da fonte: ${v}`);
  return Math.round(v * 100) / 100;
};

/**
 * Serializa o contorno do texto em `d` de SVG.
 *
 * Escrito à mão de propósito: o `toPathData()` do opentype.js emite "NaN" no
 * meio do caminho em algumas combinações de glifo e posição, e o rasterizador
 * simplesmente engole o resto da linha — foi assim que apareceram tabelas com
 * palavras cortadas pela metade. Percorrendo os comandos nós controlamos o
 * arredondamento e ainda falhamos alto se algum valor vier inválido, em vez de
 * publicar uma arte com texto faltando.
 */
function pathData(font: opentype.Font, texto: string, x: number, y: number, size: number): string {
  const cmds = font.getPath(texto, x, y, size).commands;
  const out: string[] = [];
  for (const c of cmds) {
    switch (c.type) {
      case "M":
        out.push(`M${n(c.x)} ${n(c.y)}`);
        break;
      case "L":
        out.push(`L${n(c.x)} ${n(c.y)}`);
        break;
      case "C":
        out.push(`C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`);
        break;
      case "Q":
        out.push(`Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`);
        break;
      case "Z":
        out.push("Z");
        break;
    }
  }
  return out.join("");
}

type Peca = { emoji: string; x: number; y: number; size: number };

/**
 * Monta o SVG com o texto de todas as linhas e devolve também onde cada emoji
 * precisa ser colado (o emoji não entra no SVG: é imagem, colada pelo sharp).
 */
function montarCamada(
  box: LayoutBox,
  entries: Entry[],
  W: number,
  H: number
): { svg: string; emojis: Peca[] } {
  const { font } = carregarFonte();
  const t = box.type;
  const a = ajustarParaCaber(box, entries);
  const paths: string[] = [];
  const emojis: Peca[] = [];

  entries.forEach((e, i) => {
    const baseline = t.firstBaseline + i * a.passo;
    const prefixo = `${e.rank}° `;
    const sufixo = `${e.nome} ${e.status}`;

    let x = t.left;
    paths.push(pathData(font, prefixo, x, baseline, a.fontSize));
    x += largura(font, prefixo, a.fontSize);

    // O emoji fica centrado na altura de caixa-alta, não na baseline, senão
    // parece afundado em relação ao texto.
    const capHeight = a.fontSize * 0.72;
    emojis.push({
      emoji: e.codepoint,
      x: Math.round(x + a.emojiGap),
      y: Math.round(baseline - capHeight / 2 - a.emojiSize / 2),
      size: a.emojiSize,
    });
    x += a.emojiGap * 2 + a.emojiSize;

    paths.push(pathData(font, sufixo, x, baseline, a.fontSize));
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="${t.color}">${paths
    .map((d) => `<path d="${d}"/>`)
    .join("")}</g></svg>`;

  return { svg, emojis };
}

function emojiPath(codepoint: string): string {
  return join(process.cwd(), "public", "emoji", `${codepoint}.svg`);
}

/**
 * Desenha as tabelas sobre a arte-modelo.
 *
 * `template` é sempre a arte com as tabelas VAZIAS — nunca um resultado
 * anterior. É isso que permite reeditar quantas vezes for preciso sem a
 * imagem acumular sujeira de renderizações passadas.
 */
export async function renderArt(
  template: Buffer,
  boxes: LayoutBox[],
  tables: Record<string, Entry[]>
): Promise<Buffer> {
  const meta = await sharp(template).metadata();
  const W = meta.width!;
  const H = meta.height!;

  const camadas: OverlayOptions[] = [];

  for (const box of boxes) {
    const entries = tables[String(box.slot)];
    if (!entries?.length) continue;

    const { svg, emojis } = montarCamada(box, entries, W, H);
    camadas.push({ input: Buffer.from(svg), left: 0, top: 0 });

    for (const p of emojis) {
      const caminho = emojiPath(p.emoji);
      if (!existsSync(caminho)) continue;
      const png = await sharp(caminho, { density: 384 })
        .resize(p.size, p.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      camadas.push({ input: png, left: p.x, top: p.y });
    }
  }

  return sharp(template)
    .composite(camadas)
    .jpeg({ quality: 96, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();
}
