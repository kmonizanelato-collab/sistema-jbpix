import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getArt, imagemVisivel } from "@/lib/arts";
import { queryOne } from "@/lib/db";
import { TableEditor } from "@/components/admin/table-editor";
import type { LayoutBox } from "@/lib/render";
import type { Entry } from "@/lib/parse";

/** Reconstrói o texto do editor a partir do que já foi gravado. */
function textoDe(entries: Entry[] | undefined): string {
  if (!entries?.length) return "";
  return entries.map((e) => `${e.rank}º ${e.emoji} ${e.nome} ${e.status}`).join("\n");
}

export default async function EditarArtePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const art = await getArt(Number(id));
  if (!art) notFound();

  // Voltar tem de cair na lista do tema de onde viemos, nao na raiz.
  const origem = await queryOne<{ slug: string; name: string }>(
    `SELECT t.slug, t.name FROM arts a
       JOIN cards c ON c.id = a.card_id
       JOIN themes t ON t.id = c.theme_id
      WHERE a.id = $1`,
    [art.id]
  );

  const boxes = (art.layout?.boxes ?? []) as LayoutBox[];
  const slots = boxes.map((b) => b.slot).sort();

  const textosIniciais: Record<string, string> = {};
  for (const s of slots) textosIniciais[String(s)] = textoDe(art.tables?.[String(s)]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={origem ? `/admin/artes/tema/${origem.slug}` : "/admin/artes"}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <ChevronLeft size={16} />
          {origem?.name ?? "Artes"}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
          {art.name}
        </h1>
        <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
          {slots.length === 0
            ? "Não consegui detectar as caixas desta arte."
            : `${slots.length === 1 ? "Tabela única" : "2 tabelas"} · ${art.published ? "publicada" : "não publicada"}`}
        </p>
      </div>

      {slots.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
          A detecção automática não achou as molduras vermelhas nesta imagem. Envie uma arte no
          mesmo formato das demais, ou me avise para eu liberar o ajuste manual das caixas.
        </p>
      ) : (
        <TableEditor
          id={art.id}
          nome={art.name}
          slots={slots}
          textosIniciais={textosIniciais}
          urlAtual={imagemVisivel(art)}
          publicada={art.published}
        />
      )}
    </div>
  );
}
