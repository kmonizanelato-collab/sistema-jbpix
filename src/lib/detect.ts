import sharp from "sharp";

export type Box = {
  /** Ordem da tabela na arte: 1 é a da esquerda. Arte de tabela única usa só 1. */
  slot: 1 | 2;
  /** Retângulo interno, já dentro da borda vermelha. */
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Última linha ocupada pelo título/logo dentro da caixa. Como o modelo chega
   * com a tabela vazia, tudo que está claro ali dentro é o cabeçalho — e é daí
   * que sai onde a lista pode começar. Sem medir, uma margem fixa faria a
   * primeira linha da Federal bater no título, que é mais alto que o das
   * outras artes.
   */
  titleBottom: number;
};

const isRed = (r: number, g: number, b: number) =>
  r > 130 && g < 100 && b < 100 && r - Math.max(g, b) > 70;

type Faixa = { ini: number; fim: number };

function agrupar(indices: number[], folga = 3): Faixa[] {
  const faixas: Faixa[] = [];
  for (const i of indices) {
    const ultima = faixas[faixas.length - 1];
    if (ultima && i - ultima.fim <= folga) ultima.fim = i;
    else faixas.push({ ini: i, fim: i });
  }
  return faixas;
}

/**
 * Acha as caixas da tabela pela moldura vermelha.
 *
 * Funciona com uma ou duas tabelas: as artes de PT-Rio/Goiás e Bahia/Nacional
 * têm dois painéis lado a lado, a da Federal tem um só.
 *
 * O topo e a base NÃO são deduzidos das linhas totalmente vermelhas: outros
 * elementos da arte (a pílula "DO DIA!", as barras de prêmio) também produzem
 * linhas cheias e já fizeram a detecção fechar uma caixa de 19px de altura.
 * Em vez disso, medimos o trecho contínuo de vermelho na própria coluna da
 * borda lateral — só a moldura da caixa é vermelha de cima a baixo — e daí
 * procuramos a moldura horizontal imediatamente acima e abaixo.
 *
 * O resultado é um palpite: o admin confere na tela antes de gravar.
 */
export async function detectBoxes(input: Buffer): Promise<Box[]> {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const C = info.channels;
  const at = (x: number, y: number) => {
    const i = (y * W + x) * C;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };
  const vermelho = (x: number, y: number) => {
    const [r, g, b] = at(x, y);
    return isRed(r, g, b);
  };

  // Faixa vertical onde as caixas vivem: fora dela ficam cabeçalho e rodapé,
  // que também têm vermelho e poluiriam a contagem.
  const yIni = Math.round(H * 0.15);
  const yFim = Math.round(H * 0.95);

  const colCount = new Array<number>(W).fill(0);
  for (let y = yIni; y < yFim; y++) {
    for (let x = 0; x < W; x++) if (vermelho(x, y)) colCount[x]++;
  }
  const limite = (yFim - yIni) * 0.6;
  const colunas = agrupar(colCount.map((c, x) => (c >= limite ? x : -1)).filter((x) => x >= 0));
  if (colunas.length < 2) return [];

  /** Trecho contínuo de vermelho mais longo numa coluna. */
  function corridaVertical(x: number): Faixa | null {
    let melhor: Faixa | null = null;
    let atual: Faixa | null = null;
    for (let y = yIni; y < yFim; y++) {
      if (vermelho(x, y)) {
        if (atual) atual.fim = y;
        else atual = { ini: y, fim: y };
      } else if (atual) {
        if (!melhor || atual.fim - atual.ini > melhor.fim - melhor.ini) melhor = atual;
        atual = null;
      }
    }
    if (atual && (!melhor || atual.fim - atual.ini > melhor.fim - melhor.ini)) melhor = atual;
    return melhor;
  }

  /** Linhas quase totalmente vermelhas entre duas laterais. */
  function molduras(a: number, b: number): Faixa[] {
    const m0 = a + 30;
    const m1 = b - 30;
    if (m1 <= m0) return [];
    const linhas: number[] = [];
    for (let y = yIni; y < yFim; y++) {
      let n = 0;
      for (let x = m0; x <= m1; x++) if (vermelho(x, y)) n++;
      if (n > (m1 - m0) * 0.85) linhas.push(y);
    }
    return agrupar(linhas);
  }

  const boxes: Box[] = [];
  let i = 0;
  while (i < colunas.length - 1 && boxes.length < 2) {
    const esq = colunas[i];
    const dir = colunas[i + 1];
    const a = esq.fim + 1;
    const b = dir.ini - 1;

    if (b - a < 80) {
      i++;
      continue;
    }

    const meio = Math.round((esq.ini + esq.fim) / 2);
    const corrida = corridaVertical(meio);
    if (!corrida || corrida.fim - corrida.ini < 150) {
      i++;
      continue;
    }

    const hs = molduras(a, b);

    // Topo: a última moldura que ainda está acima do início da lateral. Isso é
    // o que descarta a pílula "DO DIA!", que fica logo acima da caixa.
    const topo = [...hs].reverse().find((f) => f.fim <= corrida.ini);
    // Base: a primeira moldura suficientemente abaixo do topo. Não usamos o fim
    // da corrida como referência porque em artes de fundo vermelho a lateral
    // "continua" no fundo e passa da caixa.
    const base = topo ? hs.find((f) => f.ini - topo.fim >= 100) : undefined;
    if (!topo || !base) {
      i++;
      continue;
    }

    const cy = topo.fim + 1;
    const ch = base.ini - topo.fim - 1;

    // Última linha clara na parte de cima da caixa = fim do cabeçalho.
    let titleBottom = cy;
    const limiteBusca = cy + Math.round(ch * 0.45);
    for (let y = cy; y < limiteBusca && y < H; y++) {
      let claros = 0;
      for (let x = a + 2; x <= b - 2; x++) {
        const [r, g, bb] = at(x, y);
        if (r > 195 && g > 195 && bb > 195) claros++;
      }
      if (claros > 3) titleBottom = y;
    }

    boxes.push({
      slot: (boxes.length + 1) as 1 | 2,
      x: a,
      y: cy,
      w: b - a + 1,
      h: ch,
      titleBottom,
    });
    i += 2;
  }

  return boxes;
}
