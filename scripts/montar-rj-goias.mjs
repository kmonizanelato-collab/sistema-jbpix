/**
 * Monta a arte de PT-Rio / Look-Goiás a partir da de Nacional / PT-Bahia.
 *
 * Uso: node scripts/montar-rj-goias.mjs <origem.jpg> <saida.jpg>
 *
 * Os temas chegam sem a arte de RJ/Goiás. Em vez de redesenhar, partimos da de
 * duas tabelas e trocamos cabeçalho por cabeçalho — apagamos "NACIONAL" e
 * "PT BAHIA" com suas bandeiras e colocamos "PT- RIO" e "LOOK-GOIAS" com as
 * delas.
 *
 * Os títulos NÃO são redesenhados com fonte: são recortados da arte junina de
 * PT-Rio/Goiás, que usa exatamente o mesmo tipo condensado do cabeçalho. Como
 * é o mesmo pixel, o desenho da letra fica idêntico — reproduzir com outra
 * fonte se pareceria, mas não seria igual.
 *
 * As coordenadas do cabeçalho valem para as artes de 928x1152, que é o formato
 * em que Natal e Básico vieram. O script confere e recusa outro tamanho, em vez
 * de montar torto em silêncio.
 */
import sharp from "sharp";

const [ORIGEM, SAIDA] = process.argv.slice(2);
const JUNINA = "imagens/saida/ptrio-lookgoias.jpg";

if (!ORIGEM || !SAIDA) {
  console.error("uso: node scripts/montar-rj-goias.mjs <origem.jpg> <saida.jpg>");
  process.exit(1);
}

const dim = await sharp(ORIGEM).metadata();
if (dim.width !== 928 || dim.height !== 1152) {
  console.error(
    `Esperava uma arte 928x1152 e recebi ${dim.width}x${dim.height}. As posições do
` +
      "cabeçalho são medidas para esse formato; noutro tamanho sairia torto."
  );
  process.exit(1);
}

/** Recorta um texto branco e devolve como PNG com transparência. */
async function recortarTexto(arquivo, { x0, y0, x1, y1 }, alturaAlvo) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const { data, info } = await sharp(arquivo)
    .extract({ left: x0, top: y0, width: w, height: h })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const C = info.channels;

  // O texto é branco sobre painel quase preto, então a própria luminância
  // serve de máscara — e sai com as bordas suavizadas do original, sem
  // serrilhado.
  const PISO = 26;
  const TETO = 225;
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const lum = 0.299 * data[i * C] + 0.587 * data[i * C + 1] + 0.114 * data[i * C + 2];
    const a = Math.max(0, Math.min(1, (lum - PISO) / (TETO - PISO)));
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = Math.round(a * 255);
  }

  const escala = alturaAlvo / h;
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .resize(Math.round(w * escala), alturaAlvo, { kernel: "lanczos3" })
    .png()
    .toBuffer();
}

/**
 * Primeira faixa limpa do painel abaixo do cabeçalho.
 *
 * Não dá para fixar uma altura: no Natal um cordão de luzes ocupa os 70px
 * seguintes ao título, e no Básico a área logo abaixo já está livre. E a altura
 * importa porque o painel do Básico tem gradiente — copiar de longe deixa um
 * retângulo mais escuro à vista. Procurando a faixa limpa mais próxima, pegamos
 * o tom certo nos dois casos.
 */
async function acharFaixaLimpa(arquivo, alvo, altura) {
  const x0 = alvo.x0;
  const largura = alvo.x1 - alvo.x0 + 1;
  const { data, info } = await sharp(arquivo)
    .extract({ left: x0, top: alvo.y1 + 1, width: largura, height: 600 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const C = info.channels;

  let seguidas = 0;
  for (let y = 0; y < info.height; y++) {
    let claro = false;
    for (let x = 0; x < largura && !claro; x++) {
      const i = (y * largura + x) * C;
      if (Math.max(data[i], data[i + 1], data[i + 2]) > 70) claro = true;
    }
    seguidas = claro ? 0 : seguidas + 1;
    if (seguidas >= altura) return alvo.y1 + 1 + y - altura + 1;
  }
  throw new Error("não achei faixa limpa no painel para reconstruir o fundo");
}

/**
 * Preenchimento do cabeçalho antigo.
 *
 * Copiamos um bloco de verdade do MESMO painel, nas MESMAS colunas. Duas
 * tentativas anteriores não serviram: cor média deixa um retângulo, porque o
 * painel tem gradiente; e cor por linha amostrada na lateral também, porque a
 * borda é mais clara que o miolo. Copiando o bloco real, textura e variação
 * horizontal vêm junto e o remendo some.
 */
async function blocoDeFundo(arquivo, alvo) {
  const w = alvo.x1 - alvo.x0 + 1;
  const h = alvo.y1 - alvo.y0 + 1;
  const yLimpo = await acharFaixaLimpa(arquivo, alvo, h);
  return sharp(arquivo).extract({ left: alvo.x0, top: yLimpo, width: w, height: h }).png().toBuffer();
}

const ALTURA_TITULO = 34; // igual à do "NACIONAL" que estamos substituindo
const ALTURA_BANDEIRA = 34;

/* Cabeçalho antigo a apagar, e de onde tirar o fundo: um trecho vazio do
   mesmo painel, à direita do título. */
const APAGAR = [
  { alvo: { x0: 26, y0: 234, x1: 300, y1: 282 } },
  { alvo: { x0: 553, y0: 234, x1: 800, y1: 282 } },
];

const cabecalhos = [
  {
    bandeira: "imagens/rj.jpg",
    texto: { x0: 112, y0: 284, x1: 246, y1: 332 }, // "PT- RIO" na arte junina
    bandeiraX: 30,
    textoX: 105,
    centroY: 253,
  },
  {
    bandeira: "imagens/lk.jpg",
    texto: { x0: 732, y0: 280, x1: 926, y1: 325 }, // "LOOK-GOIAS" na arte junina
    bandeiraX: 575,
    textoX: 653,
    centroY: 257,
  },
];

const camadas = [];

for (const r of APAGAR) {
  camadas.push({
    input: await blocoDeFundo(ORIGEM, r.alvo),
    left: r.alvo.x0,
    top: r.alvo.y0,
  });
}

for (const c of cabecalhos) {
  const meta = await sharp(c.bandeira).metadata();
  const larguraBandeira = Math.round(ALTURA_BANDEIRA * (meta.width / meta.height));
  camadas.push({
    input: await sharp(c.bandeira)
      .resize(larguraBandeira, ALTURA_BANDEIRA, { fit: "fill", kernel: "lanczos3" })
      .png()
      .toBuffer(),
    left: c.bandeiraX,
    top: Math.round(c.centroY - ALTURA_BANDEIRA / 2),
  });

  const texto = await recortarTexto(JUNINA, c.texto, ALTURA_TITULO);
  camadas.push({
    input: texto,
    left: c.textoX,
    top: Math.round(c.centroY - ALTURA_TITULO / 2),
  });
}

await sharp(ORIGEM)
  .composite(camadas)
  .jpeg({ quality: 96, chromaSubsampling: "4:4:4", mozjpeg: true })
  .toFile(SAIDA);

console.log(`-> ${SAIDA}`);
