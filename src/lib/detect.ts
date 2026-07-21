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

/**
 * Onde a lista pode começar dentro do painel.
 *
 * Não é só "onde acaba o título": nas artes de Natal um cordão de luzes entra
 * pelo alto do painel, e uma lista começando logo abaixo do título ficaria
 * escrita por cima das lâmpadas. Então procuramos tudo que não é fundo — texto,
 * logo, enfeite — e devolvemos o fim do primeiro bloco.
 *
 * Dois cuidados que a arte da Federal de Natal exigiu:
 *
 * - Olhamos só o miolo horizontal do painel. O cordão de luzes contorna a
 *   caixa inteira, então perto das laterais há lâmpada em qualquer altura, e
 *   isso empurraria o começo da lista para o meio da arte.
 * - Agrupamos com folga generosa, para o título e o enfeite logo abaixo dele
 *   contarem como um bloco só.
 */
function medirCabecalho(
  at: Amostra,
  x0: number,
  x1: number,
  y0: number,
  yLimite: number
): number {
  const margem = Math.round((x1 - x0) * 0.12);
  const a = x0 + margem;
  const b = x1 - margem;
  if (b <= a) return y0;

  const linhas: number[] = [];
  for (let y = y0; y < yLimite; y++) {
    let ocupados = 0;
    for (let x = a; x <= b; x++) {
      const [r, g, bl] = at(x, y);
      if (Math.max(r, g, bl) > 90) ocupados++;
    }
    if (ocupados > 3) linhas.push(y);
  }

  // O primeiro bloco com altura de verdade. A moldura sangra um ou dois pixels
  // para dentro do painel e formaria um "bloco" de 1 linha, que venceria a
  // busca e faria a lista começar por cima do próprio cabeçalho.
  const faixas = agrupar(linhas, 25);
  return faixas.find((f) => f.fim - f.ini >= 10)?.fim ?? y0;
}

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

    const titleBottom = medirCabecalho(at, a, b, cy, Math.min(H, cy + Math.round(ch * 0.45)));

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

  if (boxes.length > 0) return boxes;

  // Nem toda arte tem moldura vermelha: a da Federal de Natal é contornada por
  // um cordão de luzes douradas. O que não muda em nenhuma delas é o painel em
  // si — um retângulo alto e quase preto, que é onde a lista vai. Procuramos
  // por ele quando a moldura não aparece.
  return detectarPaineis(at, W, H);
}

type Amostra = (x: number, y: number) => readonly [number, number, number];

function detectarPaineis(at: Amostra, W: number, H: number): Box[] {
  const preto = (x: number, y: number) => {
    const [r, g, b] = at(x, y);
    return Math.max(r, g, b) < 42;
  };

  const yIni = Math.round(H * 0.25);
  const yFim = Math.round(H * 0.85);
  const altura = yFim - yIni;

  const col = new Array<number>(W).fill(0);
  for (let x = 0; x < W; x++) {
    let n = 0;
    for (let y = yIni; y < yFim; y++) if (preto(x, y)) n++;
    col[x] = n;
  }

  // O núcleo do painel é quase todo escuro. As bordas ficam de fora dessa conta
  // porque enfeites (luzes, floco de neve) cruzam a coluna, então depois
  // alargamos com um critério mais frouxo.
  const nucleos = agrupar(
    col.map((c, x) => (c >= altura * 0.9 ? x : -1)).filter((x) => x >= 0),
    4
  ).filter((g) => g.fim - g.ini > 60);
  if (nucleos.length === 0) return [];

  const boxes: Box[] = [];
  for (const nucleo of nucleos.slice(0, 2)) {
    let x0 = nucleo.ini;
    let x1 = nucleo.fim;
    while (x0 > 0 && col[x0 - 1] >= altura * 0.5) x0--;
    while (x1 < W - 1 && col[x1 + 1] >= altura * 0.5) x1++;

    // Altura: mesmo princípio da largura. O miolo do painel é quase todo
    // escuro; as linhas do cabeçalho não são, porque o título e o logo ocupam
    // boa parte delas. Achamos o miolo e depois subimos com critério frouxo,
    // senão o painel "começaria" abaixo do próprio título.
    const largura = x1 - x0 + 1;
    const escuroPorLinha = new Array<number>(H).fill(0);
    for (let y = 0; y < H; y++) {
      let n = 0;
      for (let x = x0; x <= x1; x++) if (preto(x, y)) n++;
      escuroPorLinha[y] = n;
    }

    const miolo = agrupar(
      escuroPorLinha.map((n, y) => (n >= largura * 0.85 ? y : -1)).filter((y) => y >= 0),
      4
    ).sort((a, b) => b.fim - b.ini - (a.fim - a.ini))[0];
    if (!miolo || miolo.fim - miolo.ini < 150) continue;

    /*
      Os dois lados pedem critérios diferentes.

      Para cima, frouxo: as linhas do cabeçalho têm título e logo ocupando boa
      parte da largura, e um critério apertado deixaria o painel "começar"
      abaixo do próprio título.

      Para baixo, apertado: a borda inferior não corta seco, vai desbotando por
      uns 30px. Com o mesmo critério de cima, o painel se estenderia por dentro
      dessa transição e a última linha da lista sairia escrita em cima da borda.
    */
    const corpo = { ...miolo };
    while (corpo.ini > 0 && escuroPorLinha[corpo.ini - 1] >= largura * 0.3) corpo.ini--;
    while (corpo.fim < H - 1 && escuroPorLinha[corpo.fim + 1] >= largura * 0.8) corpo.fim++;

    const titleBottom = medirCabecalho(
      at,
      x0,
      x1,
      corpo.ini,
      Math.min(H, corpo.ini + Math.round((corpo.fim - corpo.ini) * 0.45))
    );

    boxes.push({
      slot: (boxes.length + 1) as 1 | 2,
      x: x0,
      y: corpo.ini,
      w: x1 - x0 + 1,
      h: corpo.fim - corpo.ini + 1,
      titleBottom,
    });
  }

  return boxes;
}
