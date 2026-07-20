import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getArt, imagemVisivel } from "@/lib/arts";
import { ler } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Entrega a arte como anexo.
 *
 * Existe por dois motivos: o atributo `download` do <a> é ignorado quando o
 * arquivo mora em outro domínio (o Blob mora), e assim o arquivo só sai para
 * quem está logado — a URL do Blob é pública, mas ninguém precisa conhecê-la.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const art = await getArt(Number(id));
  if (!art) return NextResponse.json({ error: "Arte não encontrada." }, { status: 404 });
  if (!art.published && user.role !== "admin") {
    return NextResponse.json({ error: "Arte não encontrada." }, { status: 404 });
  }

  // Se o arquivo renderizado sumiu (apagado por fora, storage trocado), ainda
  // entregamos o modelo em vez de estourar 500 na cara do funcionário.
  let dados: Buffer;
  try {
    dados = await ler(imagemVisivel(art));
  } catch {
    if (art.rendered_url && art.rendered_url !== art.template_url) {
      dados = await ler(art.template_url);
    } else {
      return NextResponse.json({ error: "Imagem indisponível." }, { status: 404 });
    }
  }

  const nome = art.name.replace(/[^\w\s.-]/g, "").trim() || "arte";

  return new NextResponse(new Uint8Array(dados), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(dados.length),
      "Content-Disposition": `attachment; filename="${nome}.jpg"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
