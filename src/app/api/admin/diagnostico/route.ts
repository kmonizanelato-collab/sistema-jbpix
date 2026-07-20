import { NextResponse } from "next/server";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Checagem de ambiente, só para admin.
 *
 * Existe porque a geração de arte funcionava local e derrubava a função na
 * Vercel sem deixar mensagem: resposta 500 com corpo vazio, que é o sintoma de
 * crash de módulo nativo, não de exceção. Testar cada peça em separado é o
 * único jeito de saber qual delas é.
 */
async function tentar<T>(nome: string, fn: () => Promise<T> | T) {
  try {
    const valor = await fn();
    return { nome, ok: true, valor };
  } catch (e) {
    return { nome, ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const sessao = await getSession();
  if (sessao?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const dirFontes = join(process.cwd(), "assets", "fonts");
  const dirEmoji = join(process.cwd(), "public", "emoji");

  const checagens = [
    await tentar("cwd", () => process.cwd()),
    await tentar("node", () => process.version),
    await tentar("sharp.versions", () => sharp.versions),
    await tentar("pasta de fontes existe", () => existsSync(dirFontes)),
    await tentar("fontes encontradas", () => (existsSync(dirFontes) ? readdirSync(dirFontes) : [])),
    await tentar("pasta de emoji existe", () => existsSync(dirEmoji)),
    await tentar("emojis encontrados", () =>
      existsSync(dirEmoji) ? readdirSync(dirEmoji).length : 0
    ),
    await tentar("opentype carrega a fonte", async () => {
      const { carregarFonte } = await import("@/lib/render");
      return carregarFonte().arquivo;
    }),
    await tentar("sharp cria imagem", async () => {
      const b = await sharp({
        create: { width: 8, height: 8, channels: 3, background: "#000" },
      })
        .jpeg()
        .toBuffer();
      return b.length;
    }),
    await tentar("sharp rasteriza SVG simples", async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#fff"/></svg>';
      const b = await sharp(Buffer.from(svg)).png().toBuffer();
      return b.length;
    }),
    await tentar("sharp rasteriza um emoji do disco", async () => {
      const arquivo = join(dirEmoji, "1f404.svg");
      if (!existsSync(arquivo)) return "arquivo ausente";
      const b = await sharp(arquivo, { density: 384 }).resize(29, 29).png().toBuffer();
      return b.length;
    }),
    await tentar("sharp compõe camadas", async () => {
      const base = await sharp({
        create: { width: 64, height: 64, channels: 3, background: "#111" },
      })
        .jpeg()
        .toBuffer();
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="10" fill="#fff"/></svg>';
      const b = await sharp(base)
        .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
        .jpeg()
        .toBuffer();
      return b.length;
    }),
  ];

  // Agora o caminho real, etapa por etapa, sobre uma arte de verdade.
  const { getArt } = await import("@/lib/arts");
  const { ler, salvar } = await import("@/lib/storage");
  const { renderArt } = await import("@/lib/render");
  const { parseEntries } = await import("@/lib/parse");

  const art = await getArt(3);
  let template: Buffer | null = null;
  let saida: Buffer | null = null;

  checagens.push(
    await tentar("arte 3 no banco", () => (art ? art.name : "não encontrada")),
    await tentar("baixa o modelo do Blob", async () => {
      if (!art) throw new Error("sem arte");
      template = await ler(art.template_url);
      return template.length;
    }),
    await tentar("sharp lê o modelo", async () => {
      if (!template) throw new Error("sem modelo");
      const m = await sharp(template).metadata();
      return `${m.width}x${m.height} ${m.format}`;
    }),
    await tentar("renderiza 1 linha", async () => {
      if (!art || !template) throw new Error("sem modelo");
      const { entries } = parseEntries("1º 🦩 01 - Avestruz atrasado há 17 dias");
      saida = await renderArt(template, art.layout.boxes, { "1": entries });
      return saida.length;
    }),
    await tentar("grava o resultado no Blob", async () => {
      if (!saida) throw new Error("sem saída");
      const url = await salvar("diagnostico.jpg", saida, "image/jpeg");
      return url;
    })
  );

  return NextResponse.json({ checagens }, { status: 200 });
}
