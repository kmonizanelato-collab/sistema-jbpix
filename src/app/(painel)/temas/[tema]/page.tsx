import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Images } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTheme, listCards } from "@/lib/catalog";
import { query } from "@/lib/db";

export default async function TemaPage({ params }: { params: Promise<{ tema: string }> }) {
  await requireUser();
  const { tema: slug } = await params;

  const tema = await getTheme(slug);
  if (!tema) notFound();

  const cards = await listCards(tema.id);
  const contagens = await query<{ card_id: number; total: number }>(
    `SELECT card_id, count(*)::int AS total FROM arts
      WHERE published = true AND card_id = ANY($1::int[]) GROUP BY card_id`,
    [cards.map((c) => c.id)]
  );
  const porCard = new Map(contagens.map((c) => [c.card_id, c.total]));

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{tema.name}</h1>
        <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
          Escolha o card para ver as artes.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const total = porCard.get(c.id) ?? 0;
          return (
            <li key={c.id}>
              <Link
                href={`/temas/${tema.slug}/${c.slug}`}
                className="group flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] transition-colors hover:border-[var(--border-strong)]"
              >
                <span className="mb-3 grid size-10 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  <Images size={19} />
                </span>
                <span className="font-semibold text-[var(--text)]">{c.name}</span>
                {c.subtitle && (
                  <span className="mt-0.5 text-sm text-[var(--text-muted)]">{c.subtitle}</span>
                )}
                <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)]">
                  {total === 0
                    ? "Nenhuma arte ainda"
                    : `${total} ${total === 1 ? "arte" : "artes"}`}
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
