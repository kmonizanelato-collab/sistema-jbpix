import Link from "next/link";
import {
  ArrowRight,
  Egg,
  Flame,
  LayoutGrid,
  PartyPopper,
  TreePine,
  type LucideIcon,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

const ICONS: Record<string, LucideIcon> = { LayoutGrid, Flame, PartyPopper, Egg, TreePine };

type Linha = {
  slug: string;
  name: string;
  icon: string;
  total: number;
  publicadas: number;
};

export default async function ArtesPorTemaPage() {
  await requireAdmin();

  const temas = await query<Linha>(
    `SELECT t.slug, t.name, t.icon,
            count(a.id)::int                                        AS total,
            count(a.id) FILTER (WHERE a.published)::int             AS publicadas
       FROM themes t
       LEFT JOIN cards c ON c.theme_id = t.id
       LEFT JOIN arts  a ON a.card_id  = c.id
      GROUP BY t.id, t.slug, t.name, t.icon, t.sort_order
      ORDER BY t.sort_order, t.name`
  );

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Artes</h1>
        <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
          Escolha o tema para ver e editar as artes dele.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {temas.map((t) => {
          const Icone = ICONS[t.icon] ?? LayoutGrid;
          return (
            <li key={t.slug}>
              <Link
                href={`/admin/artes/tema/${t.slug}`}
                className="group flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] transition-colors hover:border-[var(--border-strong)]"
              >
                <span className="mb-3 grid size-10 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  <Icone size={19} />
                </span>
                <span className="font-semibold text-[var(--text)]">{t.name}</span>
                <span className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {t.total === 0
                    ? "Nenhuma arte"
                    : `${t.total} ${t.total === 1 ? "arte" : "artes"} · ${t.publicadas} publicada${
                        t.publicadas === 1 ? "" : "s"
                      }`}
                </span>
                <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)]">
                  Abrir
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
