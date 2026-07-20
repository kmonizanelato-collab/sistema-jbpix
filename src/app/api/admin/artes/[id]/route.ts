import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getArt, salvarTabelas, definirPublicacao, apagarArt } from "@/lib/arts";
import { parseEntries, validateEntries, pareceListaCorrida } from "@/lib/parse";
import { renderArt, ajustarParaCaber, type LayoutBox } from "@/lib/render";
import { ler, salvar, remover } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const patch = z.object({
  /* Cada chave é o número da tabela e o valor é o texto colado. As duas são
     opcionais de propósito: o editor manda uma tabela por vez, e a que não vier
     fica como está. Texto vazio (e não ausente) é o que limpa uma tabela. */
  tabelas: z
    .object({ "1": z.string().optional(), "2": z.string().optional() })
    .optional(),
  publicar: z.boolean().optional(),
  /* Lista corrida numa linha só, do jeito que sai ao copiar pelo celular. */
  transcrever: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const sessao = await getSession();
  if (sessao?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const id = Number((await ctx.params).id);
  const art = await getArt(id);
  if (!art) return NextResponse.json({ error: "Arte não encontrada." }, { status: 404 });

  const parsed = patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  if (parsed.data.publicar !== undefined) {
    await definirPublicacao(id, parsed.data.publicar);
    if (parsed.data.tabelas === undefined) return NextResponse.json({ ok: true });
  }

  const entradas = parsed.data.tabelas ?? {};
  const boxes = (art.layout?.boxes ?? []) as LayoutBox[];
  if (boxes.length === 0) {
    return NextResponse.json(
      { error: "Esta arte não tem as caixas da tabela definidas." },
      { status: 400 }
    );
  }

  const tables: Record<string, ReturnType<typeof parseEntries>["entries"]> = {};
  const erros: Record<string, unknown> = {};
  const avisos: Record<string, string[]> = {};

  for (const [slot, valor] of Object.entries(entradas)) {
    const texto = String(valor ?? "");
    if (!texto.trim()) {
      tables[slot] = [];
      continue;
    }
    const { entries, errors } = parseEntries(texto, {
      transcrever: parsed.data.transcrever,
    });
    if (errors.length) erros[slot] = errors;
    tables[slot] = entries;

    const box = boxes.find((b) => String(b.slot) === slot);
    if (box) {
      const lista = [...validateEntries(entries)];

      if (!parsed.data.transcrever && pareceListaCorrida(texto)) {
        lista.unshift(
          "Isto parece uma lista corrida numa linha só. Ligue o Transcrever e gere de novo."
        );
      }

      // A tipografia se ajusta sozinha para nada vazar da caixa. Avisamos
      // sempre que isso acontecer, para o admin saber que a arte saiu diferente
      // do padrão e poder encurtar o conteúdo se preferir.
      const ajuste = ajustarParaCaber(box, entries);
      if (ajuste.escalaLargura < 0.995) {
        lista.push(
          `Havia linha maior que a caixa; reduzi a fonte em ${Math.round((1 - ajuste.escalaLargura) * 100)}% para caber.`
        );
      }
      if (ajuste.comprimido) {
        lista.push(`${entries.length} linhas: aproximei o espaçamento para caber na caixa.`);
      }

      if (lista.length) avisos[slot] = lista;
    }
  }

  if (Object.keys(erros).length) {
    return NextResponse.json(
      { error: "Algumas linhas não foram entendidas.", erros },
      { status: 422 }
    );
  }

  // Renderizamos SEMPRE a partir do modelo com as tabelas vazias, nunca do
  // resultado anterior — é o que deixa reeditar quantas vezes for preciso.
  const template = await ler(art.template_url);
  const saida = await renderArt(template, boxes, { ...art.tables, ...tables });

  const antiga = art.rendered_url;
  const url = await salvar(`${art.name}-render.jpg`, saida, "image/jpeg");
  await salvarTabelas(id, { ...art.tables, ...tables }, url);
  // Só apagamos a anterior depois que a nova está gravada e referenciada.
  if (antiga && antiga !== art.template_url) await remover(antiga);

  return NextResponse.json({ ok: true, url, avisos });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sessao = await getSession();
  if (sessao?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const id = Number((await ctx.params).id);
  const art = await getArt(id);
  if (!art) return NextResponse.json({ error: "Arte não encontrada." }, { status: 404 });

  await apagarArt(id);
  await remover(art.rendered_url);
  await remover(art.template_url);
  return NextResponse.json({ ok: true });
}
