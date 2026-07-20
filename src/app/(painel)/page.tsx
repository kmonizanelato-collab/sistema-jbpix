import Link from "next/link";
import { ArrowRight, Egg, Flame, LayoutGrid, PartyPopper, TreePine, type LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listThemes } from "@/lib/catalog";

const ICONS: Record<string, LucideIcon> = { LayoutGrid, Flame, PartyPopper, Egg, TreePine };

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function Home() {
  const user = await requireUser();
  const themes = await listThemes();
  const primeiroNome = user.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-[28px]">
          {saudacao()}, {primeiroNome}.
        </h1>
        <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
          Escolha um tema para ver as artes do dia.
        </p>
      </header>

      <section>
        <h2 className="sr-only">Temas</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => {
            const Icone = ICONS[t.icon] ?? LayoutGrid;
            return (
              <li key={t.slug}>
                <Link
                  href={`/temas/${t.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] transition-colors hover:border-[var(--border-strong)]"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                    <Icone size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[var(--text)]">{t.name}</span>
                  </span>
                  <ArrowRight
                    size={17}
                    className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
