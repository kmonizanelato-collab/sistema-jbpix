import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSession } from "@/lib/session";
import { detectBoxes } from "@/lib/detect";
import { typographyPadrao, type LayoutBox } from "@/lib/render";
import { salvar } from "@/lib/storage";
import { criarArt } from "@/lib/arts";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const sessao = await getSession();
  if (sessao?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const form = await request.formData();
  const arquivo = form.get("arquivo");
  const cardId = Number(form.get("cardId"));
  const nome = String(form.get("nome") ?? "").trim();

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ error: "Escolha a imagem da arte." }, { status: 400 });
  }
  if (!cardId || !nome) {
    return NextResponse.json({ error: "Informe o card e o nome da arte." }, { status: 400 });
  }
  if (arquivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "A imagem passa de 12 MB." }, { status: 413 });
  }

  const buf = Buffer.from(await arquivo.arrayBuffer());

  let meta;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    return NextResponse.json({ error: "Não reconheci esse arquivo como imagem." }, { status: 400 });
  }
  if (!meta.width || !meta.height) {
    return NextResponse.json({ error: "Imagem sem dimensões válidas." }, { status: 400 });
  }

  // A detecção é um palpite; se falhar, a arte entra mesmo assim e o admin
  // ajusta as caixas na tela. Melhor isso do que recusar o upload.
  let boxes: LayoutBox[] = [];
  try {
    boxes = (await detectBoxes(buf)).map((b) => ({ ...b, type: typographyPadrao(b) }));
  } catch {
    boxes = [];
  }

  const url = await salvar(`${nome}.jpg`, buf, arquivo.type || "image/jpeg");
  const id = await criarArt({
    cardId,
    name: nome,
    templateUrl: url,
    w: meta.width,
    h: meta.height,
    boxes,
  });

  return NextResponse.json({ ok: true, id, caixas: boxes.length });
}
