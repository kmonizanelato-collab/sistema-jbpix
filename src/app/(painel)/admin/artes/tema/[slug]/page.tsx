import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getTheme } from "@/lib/catalog";
import { imagemVisivel, type Art } from "@/lib/arts";
import { query } from "@/lib/db";
import { ArtUploader, type CardOpcao } from "@/components/admin/art-uploader";

const formatador = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function ArtesDoTemaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  const tema = await getTheme(slug);
  if (!tema) notFound();

  const artes = await query<Art & { card_name: string }>(
    `SELECT a.*, c.name AS card_name
       FROM arts a JOIN cards c ON c.id = a.card_id
      WHERE c.theme_id = $1
      ORDER BY a.created_at DESC`,
    [tema.id]
  );

  const cards = await query<CardOpcao>(
    "SELECT id, name AS label FROM cards WHERE theme_id = $1 ORDER BY sort_order, name",
    [tema.id]
  );

  return (
    <div className="space-y-7">
      <div>
        <Link
          href="/admin/artes"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <ChevronLeft size={16} />
          Artes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
          {tema.name}
        </h1>
        <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
          Envie a arte com as tabelas vazias e preencha o conteúdo aqui.
        </p>
      </div>

      <ArtUploader cards={cards} />

      {artes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-14 text-center text-sm text-[var(--text-muted)]">
          Nenhuma arte em {tema.name} ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artes.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/artes/${a.id}`}
                className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] transition-colors hover:border-[var(--border-strong)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagemVisivel(a)}
                  alt=""
                  className="aspect-[4/5] w-full bg-[var(--surface-2)] object-cover object-top"
                />
                <div className="border-t border-[var(--border)] p-4">
                  <p className="truncate font-semibold text-[var(--text)]">{a.name}</p>
                  <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">{a.card_name}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <span
                      className={`inline-block size-1.5 rounded-full ${
                        a.published ? "bg-emerald-500" : "bg-zinc-400"
                      }`}
                    />
                    {a.published ? "Publicada" : "Rascunho"} ·{" "}
                    {formatador.format(new Date(a.updated_at))}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
