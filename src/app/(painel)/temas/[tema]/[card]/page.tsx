import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ImageOff } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTheme, getCard } from "@/lib/catalog";
import { listPublished, imagemVisivel } from "@/lib/arts";
import { ArtCard } from "@/components/art-card";

const formatador = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function CardPage({
  params,
}: {
  params: Promise<{ tema: string; card: string }>;
}) {
  await requireUser();
  const { tema: temaSlug, card: cardSlug } = await params;

  const tema = await getTheme(temaSlug);
  if (!tema) notFound();
  const card = await getCard(tema.id, cardSlug);
  if (!card) notFound();

  const artes = await listPublished(card.id);

  return (
    <div className="space-y-7">
      <div>
        <Link
          href={`/temas/${tema.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <ChevronLeft size={16} />
          {tema.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
          {card.name}
        </h1>
        {card.subtitle && (
          <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">{card.subtitle}</p>
        )}
      </div>

      {artes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-14 text-center">
          <span className="mx-auto mb-3 grid size-11 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]">
            <ImageOff size={20} />
          </span>
          <p className="font-medium text-[var(--text)]">Nenhuma arte publicada aqui ainda.</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Assim que a administração publicar, ela aparece nesta página.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artes.map((a) => (
            <li key={a.id}>
              <ArtCard
                id={a.id}
                nome={a.name}
                url={imagemVisivel(a)}
                w={a.template_w}
                h={a.template_h}
                atualizadaEm={`Atualizada em ${formatador.format(new Date(a.updated_at))}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
