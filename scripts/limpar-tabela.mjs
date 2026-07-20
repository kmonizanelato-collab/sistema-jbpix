/**
 * Apaga o conteúdo das tabelas de uma arte, deixando só a moldura e o título —
 * o "modelo vazio" que o sistema usa como base para desenhar por cima.
 *
 * Uso: node scripts/limpar-tabela.mjs <entrada> <saida> [fillTopDaCaixa1,...]
 *
 * Como funciona: uma abertura morfológica (erosão seguida de dilatação) apaga
 * qualquer detalhe claro mais fino que a janela — que é exatamente o texto e os
 * emojis — preservando o fundo, que é largo. O resultado passa por um borrão
 * para tirar o quadriculado que o elemento estruturante quadrado deixa.
 *
 * A moldura vermelha é detectada e preservada; sem isso a dilatação espalharia
 * vermelho para dentro do painel.
 */
import sharp from "sharp";
import { detectBoxes } from "../src/lib/detect.ts";
import { readFileSync } from "node:fs";

function minmax(src, W, H, C, win, modo) {
  const r = (win - 1) / 2;
  const tmp = Buffer.alloc(W * H * C);
  const dst = Buffer.alloc(W * H * C);
  const melhor = modo === "min" ? (a, b) => (a < b ? a : b) : (a, b) => (a > b ? a : b);
  for (let y = 0; y < H; y++)
    for (let c = 0; c < C; c++)
      for (let x = 0; x < W; x++) {
        let v = src[(y * W + x) * C + c];
        for (let d = -r; d <= r; d++) {
          const xx = x + d;
          if (xx >= 0 && xx < W) v = melhor(v, src[(y * W + xx) * C + c]);
        }
        tmp[(y * W + x) * C + c] = v;
      }
  for (let x = 0; x < W; x++)
    for (let c = 0; c < C; c++)
      for (let y = 0; y < H; y++) {
        let v = tmp[(y * W + x) * C + c];
        for (let d = -r; d <= r; d++) {
          const yy = y + d;
          if (yy >= 0 && yy < H) v = melhor(v, tmp[(yy * W + x) * C + c]);
        }
        dst[(y * W + x) * C + c] = v;
      }
  return dst;
}

function borrar(src, W, H, C, r, passes) {
  let a = Float32Array.from(src);
  const b = new Float32Array(W * H * C);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++)
      for (let c = 0; c < C; c++)
        for (let x = 0; x < W; x++) {
          let s = 0, n = 0;
          for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < W) { s += a[(y * W + xx) * C + c]; n++; } }
          b[(y * W + x) * C + c] = s / n;
        }
    for (let x = 0; x < W; x++)
      for (let c = 0; c < C; c++)
        for (let y = 0; y < H; y++) {
          let s = 0, n = 0;
          for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < H) { s += b[(yy * W + x) * C + c]; n++; } }
          a[(y * W + x) * C + c] = s / n;
        }
  }
  return a;
}

function borrar1(src, W, H, r) {
  const a = Float32Array.from(src);
  const b = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < W) { s += a[y * W + xx]; n++; } }
      b[y * W + x] = s / n;
    }
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < H) { s += b[(yy * W + x)]; n++; } }
      a[y * W + x] = s / n;
    }
  return a;
}

const isRed = (r, g, b) => r > 125 && g < 105 && b < 105 && r - Math.max(g, b) > 65;

const [entrada, saida, fillTops] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error("uso: node scripts/limpar-tabela.mjs <entrada> <saida> <fillTop1[,fillTop2]>");
  process.exit(1);
}
const topos = (fillTops ?? "").split(",").map(Number);

const buf = readFileSync(entrada);
const boxes = await detectBoxes(buf);
console.log(`${boxes.length} caixa(s) detectada(s)`);
boxes.forEach((b) => console.log(`  slot ${b.slot}: x=${b.x} y=${b.y} ${b.w}x${b.h}`));

const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const px = Buffer.from(data);

boxes.forEach((box, idx) => {
  const fillTop = topos[idx] || box.y + 70;
  const rx0 = box.x, rx1 = box.x + box.w - 1;
  const ry0 = fillTop, ry1 = box.y + box.h - 1;
  const RW = rx1 - rx0 + 1, RH = ry1 - ry0 + 1;
  console.log(`  limpando slot ${box.slot}: y ${ry0}..${ry1}`);

  const reg = Buffer.alloc(RW * RH * 3);
  for (let y = 0; y < RH; y++)
    for (let x = 0; x < RW; x++) {
      const si = ((y + ry0) * W + (x + rx0)) * C, di = (y * RW + x) * 3;
      reg[di] = px[si]; reg[di + 1] = px[si + 1]; reg[di + 2] = px[si + 2];
    }

  // Vermelho perto das bordas = moldura. Só procuramos ali para não confundir
  // um emoji avermelhado no meio da lista com a borda da caixa.
  const red = new Uint8Array(RW * RH);
  for (let y = 0; y < RH; y++)
    for (let x = 0; x < RW; x++) {
      const perto = x < 9 || x >= RW - 9 || y >= RH - 9 || y < 2;
      const canto = y >= RH - 36 && (x < 36 || x >= RW - 36);
      if (!perto && !canto) continue;
      const i = y * RW + x;
      if (isRed(reg[i * 3], reg[i * 3 + 1], reg[i * 3 + 2])) red[i] = 1;
    }

  // Neutraliza a moldura antes da abertura, senão a dilatação joga vermelho
  // para dentro do painel.
  const flat = Buffer.from(reg);
  const redD = new Uint8Array(RW * RH);
  for (let y = 0; y < RH; y++)
    for (let x = 0; x < RW; x++) {
      let v = 0;
      for (let dy = -3; dy <= 3 && !v; dy++)
        for (let dx = -3; dx <= 3 && !v; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < RW && yy < RH && red[yy * RW + xx]) v = 1;
        }
      redD[y * RW + x] = v;
    }
  for (let y = 0; y < RH; y++) {
    const fill = [255, 255, 255];
    let achou = false;
    for (let x = 0; x < RW; x++) {
      if (redD[y * RW + x]) continue;
      achou = true;
      for (let c = 0; c < 3; c++) { const v = reg[(y * RW + x) * 3 + c]; if (v < fill[c]) fill[c] = v; }
    }
    if (!achou) fill.fill(0);
    for (let x = 0; x < RW; x++) {
      if (!redD[y * RW + x]) continue;
      const di = (y * RW + x) * 3;
      flat[di] = fill[0]; flat[di + 1] = fill[1]; flat[di + 2] = fill[2];
    }
  }

  const bg = borrar(minmax(minmax(flat, RW, RH, 3, 41, "min"), RW, RH, 3, 41, "max"), RW, RH, 3, 12, 3);

  const am = new Float32Array(RW * RH);
  for (let y = 0; y < RH; y++) {
    const rampa = Math.max(0, Math.min(1, (y - 1) / 5));
    for (let x = 0; x < RW; x++) am[y * RW + x] = red[y * RW + x] ? 0 : rampa;
  }
  const alpha = borrar1(am, RW, RH, 2);

  for (let y = 0; y < RH; y++)
    for (let x = 0; x < RW; x++) {
      const i = y * RW + x, a = alpha[i];
      if (a <= 0.003) continue;
      const si = ((y + ry0) * W + (x + rx0)) * C, di = i * 3;
      for (let c = 0; c < 3; c++) px[si + c] = Math.round(px[si + c] * (1 - a) + bg[di + c] * a);
    }
});

await sharp(px, { raw: { width: W, height: H, channels: C } })
  .jpeg({ quality: 96, chromaSubsampling: "4:4:4", mozjpeg: true })
  .toFile(saida);
console.log(`-> ${saida}`);
